"use client";

import { useMutation } from "@tanstack/react-query";
import { addApiCall } from "@/lib/apiCallLog";
import type {
  SodexExecuteResponse,
  SodexQuote,
  SodexQuoteResponse,
} from "@/lib/sodexTypes";
import type { RebalanceOrder } from "@/lib/types";

const ENDPOINT = "/api/sodex";

async function postSodex<T>(body: unknown): Promise<T> {
  const res = await fetch(ENDPOINT, {
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

function lastUpstream(meta: { upstreamCalls: { url: string }[] }): string {
  const calls = meta.upstreamCalls;
  return calls[calls.length - 1]?.url ?? ENDPOINT;
}

export interface UseSodexResult {
  quote: (orders: RebalanceOrder[]) => void;
  execute: (quotes: SodexQuote[]) => void;
  reset: () => void;
  quoteData: SodexQuoteResponse | null;
  executeData: SodexExecuteResponse | null;
  isQuoting: boolean;
  isExecuting: boolean;
  quoteError: Error | null;
  executeError: Error | null;
}

export function useSodex(): UseSodexResult {
  const quoteMutation = useMutation<SodexQuoteResponse, Error, RebalanceOrder[]>({
    mutationFn: (orders) =>
      postSodex<SodexQuoteResponse>({ action: "quote", orders }),
    onSuccess: (data) => {
      const tradable = data.quotes.filter((q) => q.tradable).length;
      addApiCall({
        source: "sodex",
        endpoint: `${ENDPOINT} (quote)`,
        upstreamUrl: lastUpstream(data.meta),
        status: 200,
        ok: true,
        latencyMs: data.meta.totalLatencyMs,
        summary: `quote · ${tradable}/${data.quotes.length} tradable · ${data.network}`,
        detail: data.account
          ? `account ${data.account.accountId} (${data.account.ready ? "ready" : "no account"})`
          : "no signer configured",
      });
    },
    onError: (error) => logError("quote", error),
  });

  const executeMutation = useMutation<SodexExecuteResponse, Error, SodexQuote[]>({
    mutationFn: (quotes) =>
      postSodex<SodexExecuteResponse>({ action: "execute", quotes }),
    onSuccess: (data) => {
      addApiCall({
        source: "sodex",
        endpoint: `${ENDPOINT} (execute)`,
        upstreamUrl: lastUpstream(data.meta),
        status: data.code === 0 ? 200 : 502,
        ok: data.code === 0,
        latencyMs: data.meta.totalLatencyMs,
        summary: `execute · ${data.results.length} orders · ${data.message}`,
        detail: data.results
          .map((r) => `${r.side} ${r.symbol}: ${r.status ?? "?"}${r.orderId ? ` #${r.orderId}` : ""}`)
          .join("  |  "),
      });
    },
    onError: (error) => logError("execute", error),
  });

  return {
    quote: (orders) => quoteMutation.mutate(orders),
    execute: (quotes) => executeMutation.mutate(quotes),
    reset: () => {
      quoteMutation.reset();
      executeMutation.reset();
    },
    quoteData: quoteMutation.data ?? null,
    executeData: executeMutation.data ?? null,
    isQuoting: quoteMutation.isPending,
    isExecuting: executeMutation.isPending,
    quoteError: quoteMutation.error,
    executeError: executeMutation.error,
  };
}

function logError(action: string, error: Error) {
  addApiCall({
    source: "sodex",
    endpoint: `${ENDPOINT} (${action})`,
    upstreamUrl: "(failed)",
    status: 0,
    ok: false,
    latencyMs: 0,
    summary: `${action} failed`,
    detail: error.message,
  });
}
