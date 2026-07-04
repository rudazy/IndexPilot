"use client";

import { useEffect, useState, type RefObject } from "react";
import type {
  SodexExecuteResponse,
  SodexOrderFillStatus,
  SodexOrderStatusResponse,
} from "@/lib/sodexTypes";
import { addApiCall } from "@/lib/apiCallLog";
import { updateActivityEntry } from "@/lib/activityLog";

export type FillPollState = "idle" | "polling" | "filled" | "pending" | "error";

export interface UseOrderFillsResult {
  state: FillPollState;
  /** Latest known status per clOrdId. */
  statuses: Map<string, SodexOrderFillStatus>;
}

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 60_000;

const EMPTY_STATUSES = new Map<string, SodexOrderFillStatus>();

/**
 * After an accepted execution, polls the SoDEX account's order list every 3
 * seconds for up to 60 seconds. Resolves to "filled" when every submitted
 * order reports FILLED, or "pending" on timeout (the UI then links to SoDEX
 * for manual verification). The linked activity-log entry is upgraded to the
 * terminal status so history reflects reality.
 */
export function useOrderFills(
  executeData: SodexExecuteResponse | null,
  activityEntryIdRef: RefObject<string | null>,
): UseOrderFillsResult {
  const [state, setState] = useState<FillPollState>("idle");
  const [statuses, setStatuses] = useState<Map<string, SodexOrderFillStatus>>(EMPTY_STATUSES);

  useEffect(() => {
    if (!executeData || executeData.code !== 0 || executeData.results.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset when the execution result is cleared
      setState("idle");
      setStatuses(EMPTY_STATUSES);
      return;
    }

    const clOrdIds = executeData.results.map((r) => r.clOrdId);
    const network = executeData.network;
    const startedAt = Date.now();
    let done = false;
    let inFlight = false;

    setState("polling");
    setStatuses(EMPTY_STATUSES);

    const finish = (terminal: FillPollState, pollCount: number, found: number, filled: number) => {
      done = true;
      clearInterval(timer);
      setState(terminal);
      const entryId = activityEntryIdRef.current;
      if (entryId && (terminal === "filled" || terminal === "pending")) {
        updateActivityEntry(entryId, { fillStatus: terminal });
      }
      addApiCall({
        source: "sodex",
        endpoint: "/api/sodex (orderStatus)",
        upstreamUrl: `${network} /accounts/{addr}/orders`,
        status: terminal === "error" ? 0 : 200,
        ok: terminal === "filled",
        latencyMs: Date.now() - startedAt,
        summary: `fill poll · ${terminal} · ${filled}/${clOrdIds.length} filled after ${pollCount} poll${pollCount === 1 ? "" : "s"}`,
        detail:
          terminal === "pending"
            ? `${found}/${clOrdIds.length} orders visible after ${Math.round(POLL_TIMEOUT_MS / 1000)}s; check SoDEX directly.`
            : undefined,
      });
    };

    let pollCount = 0;
    const poll = async () => {
      if (done || inFlight) return;
      inFlight = true;
      pollCount += 1;
      try {
        const res = await fetch("/api/sodex", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ action: "orderStatus", clOrdIds, network }),
        });
        if (!res.ok) {
          // Config problems (503) will not fix themselves inside the window.
          if (res.status === 503) finish("error", pollCount, 0, 0);
          return;
        }
        const data = (await res.json()) as SodexOrderStatusResponse;
        if (done) return;
        const next = new Map(data.statuses.map((s) => [s.clOrdId, s]));
        setStatuses(next);
        const found = data.statuses.filter((s) => s.found).length;
        const filled = data.statuses.filter((s) => s.filled).length;
        if (filled === clOrdIds.length) {
          finish("filled", pollCount, found, filled);
        } else if (Date.now() - startedAt >= POLL_TIMEOUT_MS) {
          finish("pending", pollCount, found, filled);
        }
      } catch {
        // Transient network error: keep polling until the timeout.
        if (Date.now() - startedAt >= POLL_TIMEOUT_MS) finish("pending", pollCount, 0, 0);
      } finally {
        inFlight = false;
      }
    };

    const timer = setInterval(() => void poll(), POLL_INTERVAL_MS);
    void poll();

    return () => {
      done = true;
      clearInterval(timer);
    };
    // activityEntryIdRef is a stable ref object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [executeData]);

  return { state, statuses };
}
