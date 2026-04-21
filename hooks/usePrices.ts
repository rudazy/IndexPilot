"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchPrices, PRICE_CACHE_STALE_MS } from "@/lib/sosovalue";
import type { PriceSnapshot } from "@/lib/types";

export interface UsePricesResult {
  prices: PriceSnapshot[];
  priceMap: Map<string, PriceSnapshot>;
  source: "sosovalue" | "coingecko" | null;
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
