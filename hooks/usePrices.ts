"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchPrices, PRICE_CACHE_STALE_MS } from "@/lib/sosovalue";
import type { PriceSnapshot } from "@/lib/types";
import { addApiCall } from "@/lib/apiCallLog";

export interface UsePricesResult {
  prices: PriceSnapshot[];
  priceMap: Map<string, PriceSnapshot>;
  source: "sosovalue" | null;
  fetchedAt: number | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function usePrices(symbols: string[]): UsePricesResult {
  const key = [...symbols].map((s) => s.toUpperCase()).sort();
  const query = useQuery({
    queryKey: ["prices", key],
    queryFn: () => fetchPrices(key),
    enabled: key.length > 0,
    staleTime: PRICE_CACHE_STALE_MS,
    refetchInterval: PRICE_CACHE_STALE_MS,
  });

  const lastLoggedAt = useRef<number | null>(null);

  useEffect(() => {
    if (!query.data || !query.dataUpdatedAt) return;
    if (lastLoggedAt.current === query.dataUpdatedAt) return;
    lastLoggedAt.current = query.dataUpdatedAt;

    const { upstreamCalls, totalLatencyMs } = query.data.meta;
    const okCount = upstreamCalls.filter((c) => c.ok).length;
    const symbolsSummary = upstreamCalls
      .map((c) => c.symbol)
      .filter(Boolean)
      .join(",");

    for (const call of upstreamCalls) {
      addApiCall({
        source: "prices",
        endpoint: "/api/prices",
        upstreamUrl: call.url,
        status: call.status,
        ok: call.ok,
        latencyMs: call.latencyMs,
        summary: `${call.symbol ?? "?"} · ${call.ok ? "ok" : "fail"}`,
        detail: call.error,
      });
    }

    addApiCall({
      source: "prices",
      endpoint: "/api/prices",
      upstreamUrl: "(aggregate)",
      status: 200,
      ok: okCount === upstreamCalls.length,
      latencyMs: totalLatencyMs,
      summary: `batch · ${symbolsSummary || "?"} · ${okCount}/${upstreamCalls.length} ok`,
    });
  }, [query.data, query.dataUpdatedAt]);

  useEffect(() => {
    if (!query.error) return;
    addApiCall({
      source: "prices",
      endpoint: "/api/prices",
      upstreamUrl: "(failed)",
      status: 0,
      ok: false,
      latencyMs: 0,
      summary: "request failed",
      detail: query.error instanceof Error ? query.error.message : String(query.error),
    });
  }, [query.error]);

  const prices = query.data?.prices ?? [];
  const priceMap = new Map(prices.map((p) => [p.symbol, p]));

  return {
    prices,
    priceMap,
    source: query.data?.source ?? null,
    fetchedAt: query.data?.fetchedAt ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error instanceof Error ? query.error : null,
    refetch: () => {
      void query.refetch();
    },
  };
}
