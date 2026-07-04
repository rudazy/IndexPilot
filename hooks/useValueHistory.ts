"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import type { IndexConfig, PortfolioState, PriceSnapshot } from "@/lib/types";
import type { SodexNetwork } from "@/lib/sodexTypes";
import {
  getEmptyValueHistoryPoints,
  getValueHistoryPoints,
  hydrateValueHistory,
  recordValueSnapshot,
  subscribeValueHistory,
  type ValueHistoryPoint,
} from "@/lib/valueHistory";

export interface UseValueHistoryResult {
  /** Points for the active network only, oldest first (chart-ready). */
  points: ValueHistoryPoint[];
}

/**
 * Records a value snapshot whenever the portfolio recomputes (price refresh,
 * balance change) and the 5-minute interval has elapsed, and exposes the
 * persisted history for the performance chart.
 */
export function useValueHistory(
  portfolio: PortfolioState | null,
  prices: PriceSnapshot[],
  config: IndexConfig | null,
  network: SodexNetwork,
): UseValueHistoryResult {
  const allPoints = useSyncExternalStore(
    subscribeValueHistory,
    getValueHistoryPoints,
    getEmptyValueHistoryPoints,
  );

  useEffect(() => {
    hydrateValueHistory();
  }, []);

  useEffect(() => {
    if (!portfolio || !config || portfolio.totalValueUsd <= 0) return;
    if (prices.length === 0) return;
    recordValueSnapshot({
      totalValueUsd: portfolio.totalValueUsd,
      prices: Object.fromEntries(prices.map((p) => [p.symbol, p.priceUsd])),
      weights: Object.fromEntries(
        config.allocations.map((a) => [a.symbol, a.targetWeight]),
      ),
      network,
    });
    // computedAt identifies each distinct portfolio computation.
  }, [portfolio, prices, config, network]);

  const points = useMemo(
    () =>
      allPoints
        .filter((p) => p.network === network)
        .slice()
        .reverse(),
    [allPoints, network],
  );

  return { points };
}
