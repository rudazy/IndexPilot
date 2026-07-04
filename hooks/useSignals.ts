"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { addApiCall } from "@/lib/apiCallLog";
import type {
  MarketSignal,
  RebalanceUrgency,
  SignalUpstreamCall,
} from "@/lib/signalTypes";

export interface SignalsResponse {
  urgency: RebalanceUrgency;
  score: number;
  signals: MarketSignal[];
  usedProxy: boolean;
  computedAt: number;
  meta: {
    upstreamCalls: SignalUpstreamCall[];
    totalLatencyMs: number;
  };
}

export interface UseSignalsResult {
  urgency: RebalanceUrgency | null;
  score: number | null;
  signals: MarketSignal[];
  usedProxy: boolean;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

const SIGNALS_STALE_MS = 5 * 60 * 1000;

async function fetchSignals(symbols: string[]): Promise<SignalsResponse> {
  const params = new URLSearchParams({ symbols: symbols.join(",") });
  const res = await fetch(`/api/signals?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
  });
  if (!res.ok) {
    let detail = "";
    try {
      const body = (await res.json()) as { error?: string };
      detail = body.error ?? "";
    } catch {
      detail = await res.text();
    }
    throw new Error(`Signal fetch failed (${res.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`);
  }
  return (await res.json()) as SignalsResponse;
}

export function useSignals(symbols: string[]): UseSignalsResult {
  const key = [...symbols].map((s) => s.toUpperCase()).sort();

  const query = useQuery({
    queryKey: ["signals", key],
    queryFn: () => fetchSignals(key),
    enabled: key.length > 0,
    staleTime: SIGNALS_STALE_MS,
    refetchInterval: SIGNALS_STALE_MS,
    refetchOnWindowFocus: false,
  });

  const lastLoggedAt = useRef<number | null>(null);

  useEffect(() => {
    if (!query.data || !query.dataUpdatedAt) return;
    if (lastLoggedAt.current === query.dataUpdatedAt) return;
    lastLoggedAt.current = query.dataUpdatedAt;

    const { urgency, signals, usedProxy, meta } = query.data;
    const okCount = meta.upstreamCalls.filter((c) => c.ok).length;
    addApiCall({
      source: "signals",
      endpoint: "/api/signals",
      upstreamUrl: meta.upstreamCalls[0]?.url ?? "(aggregate)",
      status: 200,
      ok: okCount > 0,
      latencyMs: meta.totalLatencyMs,
      summary: `urgency ${urgency} · ${signals.length} signals${usedProxy ? " · proxy" : ""} · ${okCount}/${meta.upstreamCalls.length} upstream ok`,
      detail: signals.map((s) => s.detail).join(" "),
    });
  }, [query.data, query.dataUpdatedAt]);

  useEffect(() => {
    if (!query.error) return;
    addApiCall({
      source: "signals",
      endpoint: "/api/signals",
      upstreamUrl: "(failed)",
      status: 0,
      ok: false,
      latencyMs: 0,
      summary: "signal fetch failed",
      detail: query.error instanceof Error ? query.error.message : String(query.error),
    });
  }, [query.error]);

  return {
    urgency: query.data?.urgency ?? null,
    score: query.data?.score ?? null,
    signals: query.data?.signals ?? [],
    usedProxy: query.data?.usedProxy ?? false,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error instanceof Error ? query.error : null,
    refetch: () => {
      void query.refetch();
    },
  };
}
