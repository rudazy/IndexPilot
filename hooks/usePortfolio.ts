"use client";

import { useEffect, useMemo, useState } from "react";
import { computePortfolio, type Balance } from "@/lib/rebalance";
import {
  loadHoldings,
  loadConfig,
  saveHoldings,
  clearHoldings,
} from "@/lib/storage";
import type {
  IndexConfig,
  PortfolioState,
  PriceSnapshot,
  SimulatedHoldings,
} from "@/lib/types";
import { usePrices } from "./usePrices";

const DEFAULT_STARTING_VALUE_USD = 10_000;

export interface UsePortfolioResult {
  config: IndexConfig | null;
  portfolio: PortfolioState | null;
  holdings: SimulatedHoldings | null;
  prices: PriceSnapshot[];
  priceSource: "sosovalue" | "coingecko" | null;
  fetchedAt: number | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  resetHoldings: () => void;
}

export function usePortfolio(): UsePortfolioResult {
  const [config, setConfig] = useState<IndexConfig | null>(null);
  const [holdings, setHoldings] = useState<SimulatedHoldings | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR-safe hydration from localStorage
    setConfig(loadConfig());
    setHoldings(loadHoldings());
  }, []);

  const symbols = useMemo(
    () => config?.allocations.map((a) => a.symbol) ?? [],
    [config],
  );

  const pricesQuery = usePrices(symbols);

  useEffect(() => {
    if (!config) return;
    if (pricesQuery.isLoading) return;
    if (pricesQuery.prices.length === 0) return;
    if (holdings) return;

    const priceMap = new Map(pricesQuery.prices.map((p) => [p.symbol, p.priceUsd]));
    const startingValueUsd = DEFAULT_STARTING_VALUE_USD;
    const balances: Record<string, number> = {};
    for (const a of config.allocations) {
      const price = priceMap.get(a.symbol);
      if (!price || price === 0) continue;
      const allocationUsd = (a.targetWeight / 100) * startingValueUsd;
      balances[a.symbol] = allocationUsd / price;
    }

    const snap: SimulatedHoldings = {
      schemaVersion: 1,
      startingValueUsd,
      createdAt: Date.now(),
      balances,
    };
    saveHoldings(snap);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- derived from async price fetch, gated to run once
    setHoldings(snap);
  }, [config, holdings, pricesQuery.isLoading, pricesQuery.prices]);

  const portfolio = useMemo<PortfolioState | null>(() => {
    if (!config || !holdings || pricesQuery.prices.length === 0) return null;
    const balances: Balance[] = config.allocations.map((a) => ({
      symbol: a.symbol,
      amount: holdings.balances[a.symbol] ?? 0,
    }));
    return computePortfolio(config, balances, pricesQuery.prices);
  }, [config, holdings, pricesQuery.prices]);

  const resetHoldings = () => {
    clearHoldings();
    setHoldings(null);
  };

  return {
    config,
    portfolio,
    holdings,
    prices: pricesQuery.prices,
    priceSource: pricesQuery.source,
    fetchedAt: pricesQuery.fetchedAt,
    isLoading: pricesQuery.isLoading && !portfolio,
    isError: pricesQuery.isError,
    error: pricesQuery.error,
    refetch: pricesQuery.refetch,
    resetHoldings,
  };
}
