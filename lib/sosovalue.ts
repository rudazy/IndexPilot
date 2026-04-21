import type { PriceSnapshot } from "./types";

export interface PriceApiResponse {
  prices: PriceSnapshot[];
  source: "sosovalue" | "coingecko";
  fetchedAt: number;
}

export async function fetchPrices(symbols: string[]): Promise<PriceApiResponse> {
  if (symbols.length === 0) {
    return { prices: [], source: "coingecko", fetchedAt: Date.now() };
  }

  const params = new URLSearchParams({ symbols: symbols.join(",") });
  const res = await fetch(`/api/prices?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Price fetch failed (${res.status}): ${body.slice(0, 200)}`);
  }

  return (await res.json()) as PriceApiResponse;
}

export const PRICE_CACHE_STALE_MS = 5 * 60 * 1000;
export const PRICE_CACHE_GC_MS = 15 * 60 * 1000;
