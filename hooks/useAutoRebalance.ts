"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import type { IndexConfig, PortfolioState, RebalancePlan } from "@/lib/types";
import type {
  SodexExecuteResponse,
  SodexNetwork,
  SodexQuoteResponse,
} from "@/lib/sodexTypes";
import { URGENCY_RANK, type RebalanceUrgency } from "@/lib/signalTypes";
import {
  getAutoRebalanceSettings,
  getDefaultAutoRebalanceSettings,
  hydrateAutoRebalanceSettings,
  subscribeAutoRebalanceSettings,
} from "@/lib/autoRebalance";
import { addActivityEntry } from "@/lib/activityLog";
import { addApiCall } from "@/lib/apiCallLog";
import { addToast } from "@/lib/toast";
import { formatUsd } from "@/lib/utils";

export type AutoRebalanceStatus =
  /** Auto mode off. */
  | "off"
  /** Armed: polling and ready to execute when conditions are met. */
  | "active"
  /** Enabled, but on mainnet without the explicit mainnet confirmation. */
  | "blocked-mainnet"
  /** Enabled, but the index uses a time trigger instead of a drift threshold. */
  | "inactive-trigger";

export interface UseAutoRebalanceResult {
  status: AutoRebalanceStatus;
  intervalMs: number;
}

interface AutoRebalanceInputs {
  portfolio: PortfolioState | null;
  plan: RebalancePlan | null;
  config: IndexConfig | null;
  urgency: RebalanceUrgency | null;
  network: SodexNetwork;
  briefingHeadline: string | null;
  /** Forces a fresh price/balance fetch; called on each poll tick. */
  refetch: () => void;
}

async function postSodex<T>(body: unknown): Promise<T> {
  const res = await fetch("/api/sodex", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = "";
    try {
      const json = (await res.json()) as { error?: string };
      detail = json.error ?? "";
    } catch {
      detail = await res.text();
    }
    throw new Error(detail || `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

function planFingerprint(plan: RebalancePlan, network: SodexNetwork): string {
  const legs = plan.orders
    .map((o) => `${o.side}:${o.symbol}:${Math.round(o.amountUsd / 10)}`)
    .sort()
    .join("|");
  return `${network}::${legs}`;
}

/**
 * The autonomous loop: while enabled, polls drift on the configured cadence
 * and executes the rebalance plan on SoDEX without a click when ALL of these
 * hold: the index uses a drift trigger and drift exceeds its threshold, the
 * market-signal urgency is medium or above, and (on mainnet) the user
 * explicitly confirmed auto-execution when enabling.
 *
 * Refire protection: one execution per plan fingerprint, plus a full poll
 * interval of cooldown between executions, plus a concurrency guard.
 */
export function useAutoRebalance(inputs: AutoRebalanceInputs): UseAutoRebalanceResult {
  const settings = useSyncExternalStore(
    subscribeAutoRebalanceSettings,
    getAutoRebalanceSettings,
    getDefaultAutoRebalanceSettings,
  );

  useEffect(() => {
    hydrateAutoRebalanceSettings();
  }, []);

  const { portfolio, plan, config, urgency, network, briefingHeadline, refetch } = inputs;

  const status: AutoRebalanceStatus = !settings.enabled
    ? "off"
    : config !== null && config.trigger.kind !== "drift"
      ? "inactive-trigger"
      : network === "mainnet" && !settings.mainnetConfirmed
        ? "blocked-mainnet"
        : "active";

  // Poll tick: force a data refresh on the configured cadence. The evaluation
  // below runs automatically when the refreshed data lands.
  useEffect(() => {
    if (status !== "active") return;
    const timer = setInterval(() => refetch(), settings.intervalMs);
    return () => clearInterval(timer);
    // refetch comes from usePortfolio and is recreated per render; keeping it
    // out of deps avoids resetting the timer on every data update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, settings.intervalMs]);

  const executingRef = useRef(false);
  const lastFiredFingerprintRef = useRef<string | null>(null);
  const lastFiredAtRef = useRef(0);

  useEffect(() => {
    if (status !== "active") return;
    if (!portfolio || !plan || !config) return;
    if (config.trigger.kind !== "drift") return;
    if (!portfolio.needsRebalance) return;
    if (plan.orders.length === 0) return;
    if (!urgency || URGENCY_RANK[urgency] < URGENCY_RANK.medium) return;
    if (executingRef.current) return;

    const fingerprint = planFingerprint(plan, network);
    if (fingerprint === lastFiredFingerprintRef.current) return;
    if (Date.now() - lastFiredAtRef.current < settings.intervalMs) return;

    executingRef.current = true;

    const fire = async () => {
      try {
        const quoteRes = await postSodex<SodexQuoteResponse>({
          action: "quote",
          orders: plan.orders,
          network,
        });
        const tradable = quoteRes.quotes.filter((q) => q.tradable);

        if (tradable.length === 0 || quoteRes.account?.ready !== true) {
          // Nothing executable (all legs below minimums, or no funded SoDEX
          // account). Record the attempt so the loop backs off for a full
          // interval instead of re-quoting on every data update.
          lastFiredAtRef.current = Date.now();
          addApiCall({
            source: "sodex",
            endpoint: "/api/sodex (auto)",
            upstreamUrl: "(skipped)",
            status: 200,
            ok: false,
            latencyMs: quoteRes.meta.totalLatencyMs,
            summary: `auto-rebalance skipped · ${
              tradable.length === 0 ? "no tradable legs" : "account not ready"
            }`,
          });
          return;
        }

        const execRes = await postSodex<SodexExecuteResponse>({
          action: "execute",
          quotes: tradable,
          network,
        });

        lastFiredFingerprintRef.current = fingerprint;
        lastFiredAtRef.current = Date.now();

        const ok = execRes.code === 0;
        const resultByClOrd = new Map(execRes.results.map((r) => [r.clOrdId, r]));
        const totalUsd = tradable.reduce((sum, q) => sum + q.estNotionalUsd, 0);

        addActivityEntry({
          network: execRes.network,
          trigger: "auto",
          orders: tradable.map((q) => ({
            side: q.side,
            symbol: q.symbol,
            amountUsd: q.estNotionalUsd,
            orderId: resultByClOrd.get(q.clOrdId)?.orderId ?? null,
          })),
          totalUsd,
          fillStatus: ok ? "accepted" : "rejected",
          briefingHeadline,
        });

        addApiCall({
          source: "sodex",
          endpoint: "/api/sodex (auto)",
          upstreamUrl: execRes.meta.upstreamCalls[execRes.meta.upstreamCalls.length - 1]?.url ?? "/api/sodex",
          status: ok ? 200 : 502,
          ok,
          latencyMs: execRes.meta.totalLatencyMs,
          summary: `auto-rebalance · ${execRes.results.length} orders · ${execRes.message}`,
        });

        addToast(
          ok
            ? {
                tone: "success",
                title: "Auto-rebalance executed",
                message: `${tradable.length} order${tradable.length === 1 ? "" : "s"} (${formatUsd(totalUsd)}) submitted on ${execRes.network}.`,
              }
            : {
                tone: "danger",
                title: "Auto-rebalance rejected",
                message: execRes.message,
              },
        );

        // Refresh balances so the dashboard reflects the executed trades.
        refetch();
      } catch (error) {
        lastFiredAtRef.current = Date.now();
        const message = error instanceof Error ? error.message : String(error);
        addApiCall({
          source: "sodex",
          endpoint: "/api/sodex (auto)",
          upstreamUrl: "(failed)",
          status: 0,
          ok: false,
          latencyMs: 0,
          summary: "auto-rebalance failed",
          detail: message,
        });
        addToast({ tone: "danger", title: "Auto-rebalance failed", message });
      } finally {
        executingRef.current = false;
      }
    };

    void fire();
    // refetch intentionally omitted; see the poll-tick effect above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, portfolio, plan, config, urgency, network, briefingHeadline, settings.intervalMs]);

  return { status, intervalMs: settings.intervalMs };
}
