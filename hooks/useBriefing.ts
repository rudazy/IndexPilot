"use client";

import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import type {
  PortfolioState,
  PriceSnapshot,
  RebalancePlan,
} from "@/lib/types";
import { addApiCall } from "@/lib/apiCallLog";

export type BriefingConfidence = "high" | "medium" | "low";

export interface Briefing {
  headline: string;
  drift_summary: string;
  trade_rationale: string;
  risk_note: string;
  confidence: BriefingConfidence;
}

export interface BriefingUpstreamCall {
  url: string;
  status: number;
  latencyMs: number;
  ok: boolean;
  error?: string;
}

export interface BriefingMeta {
  model: string;
  latencyMs: number;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheCreationTokens: number;
  };
  upstreamCalls: BriefingUpstreamCall[];
}

export interface BriefingResponse {
  briefing: Briefing;
  meta: BriefingMeta;
}

export interface UseBriefingResult {
  briefing: Briefing | null;
  meta: BriefingMeta | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  isFetching: boolean;
}

const BRIEFING_STALE_MS = 5 * 60 * 1000;
const BRIEFING_GC_MS = 15 * 60 * 1000;

export function useBriefing(
  portfolio: PortfolioState | null,
  plan: RebalancePlan | null,
  prices: PriceSnapshot[],
  indexName: string | null,
): UseBriefingResult {
  const planFingerprint = useMemo(() => {
    if (!plan) return null;
    if (plan.orders.length === 0) return "no-orders";
    return plan.orders
      .map((o) => `${o.side}:${o.symbol}:${Math.round(o.amountUsd)}`)
      .join("|");
  }, [plan]);

  const enabled =
    !!portfolio &&
    !!plan &&
    prices.length > 0 &&
    portfolio.totalValueUsd > 0 &&
    !!indexName;

  const query = useQuery<BriefingResponse, Error>({
    queryKey: ["briefing", indexName, planFingerprint],
    enabled,
    staleTime: BRIEFING_STALE_MS,
    gcTime: BRIEFING_GC_MS,
    retry: 0,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (!portfolio || !plan) {
        throw new Error("Portfolio or plan unavailable.");
      }
      const res = await fetch("/api/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          portfolio: {
            totalValueUsd: portfolio.totalValueUsd,
            needsRebalance: portfolio.needsRebalance,
            holdings: portfolio.holdings.map((h) => ({
              symbol: h.symbol,
              balance: h.balance,
              priceUsd: h.priceUsd,
              valueUsd: h.valueUsd,
              currentWeight: h.currentWeight,
              targetWeight: h.targetWeight,
              driftPct: h.driftPct,
              status: h.status,
            })),
          },
          plan: {
            reason: plan.reason,
            explanation: plan.explanation,
            orders: plan.orders.map((o) => ({
              side: o.side,
              symbol: o.symbol,
              amountToken: o.amountToken,
              amountUsd: o.amountUsd,
              priceUsd: o.priceUsd,
            })),
          },
          prices: prices.map((p) => ({
            symbol: p.symbol,
            priceUsd: p.priceUsd,
            change24hPct: p.change24hPct,
            source: p.source,
          })),
        }),
      });

      if (!res.ok) {
        let detail = "";
        try {
          const body = (await res.json()) as { error?: string };
          detail = body.error ?? "";
        } catch {
          detail = await res.text();
        }
        throw new Error(
          `Briefing request failed (${res.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`,
        );
      }

      return (await res.json()) as BriefingResponse;
    },
  });

  const lastLoggedAt = useRef<number | null>(null);

  useEffect(() => {
    if (!query.data || !query.dataUpdatedAt) return;
    if (lastLoggedAt.current === query.dataUpdatedAt) return;
    lastLoggedAt.current = query.dataUpdatedAt;

    const { meta, briefing } = query.data;
    const upstream = meta.upstreamCalls[0];

    addApiCall({
      source: "briefing",
      endpoint: "/api/briefing",
      upstreamUrl: upstream?.url ?? "https://api.anthropic.com/v1/messages",
      status: upstream?.status ?? 200,
      ok: upstream?.ok ?? true,
      latencyMs: meta.latencyMs,
      summary: `${meta.model} · ${briefing.confidence} confidence`,
      tokens: {
        input: meta.usage.inputTokens,
        output: meta.usage.outputTokens,
        cacheRead: meta.usage.cacheReadTokens,
      },
    });
  }, [query.data, query.dataUpdatedAt]);

  useEffect(() => {
    if (!query.error) return;
    addApiCall({
      source: "briefing",
      endpoint: "/api/briefing",
      upstreamUrl: "(failed)",
      status: 0,
      ok: false,
      latencyMs: 0,
      summary: "briefing request failed",
      detail: query.error instanceof Error ? query.error.message : String(query.error),
    });
  }, [query.error]);

  return {
    briefing: query.data?.briefing ?? null,
    meta: query.data?.meta ?? null,
    isLoading: query.isLoading && enabled,
    isError: query.isError,
    error: query.error ?? null,
    refetch: () => {
      void query.refetch();
    },
    isFetching: query.isFetching,
  };
}
