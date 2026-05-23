"use client";

import { useEffect, useMemo, useState } from "react";
import { computePortfolio, type Balance } from "@/lib/rebalance";
import { loadConfig } from "@/lib/storage";
import type {
  IndexConfig,
  PortfolioState,
  PriceSnapshot,
} from "@/lib/types";
import { usePrices } from "./usePrices";
import { useWalletBalances } from "./useWalletBalances";

export interface UsePortfolioResult {
  config: IndexConfig | null;
  portfolio: PortfolioState | null;
  prices: PriceSnapshot[];
  priceSource: "sosovalue" | null;
  fetchedAt: number | null;
  walletAddress: `0x${string}` | undefined;
  isWalletConnected: boolean;
  hasHoldings: boolean;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function usePortfolio(): UsePortfolioResult {
  const [config, setConfig] = useState<IndexConfig | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR-safe hydration from localStorage
    setConfig(loadConfig());
  }, []);

  const symbols = useMemo(
    () => config?.allocations.map((a) => a.symbol) ?? [],
    [config],
  );

  const pricesQuery = usePrices(symbols);
  const wallet = useWalletBalances(symbols);

  const portfolio = useMemo<PortfolioState | null>(() => {
    if (!config) return null;
    if (pricesQuery.prices.length === 0) return null;
    if (!wallet.isConnected) return null;

    const balanceBySymbol = new Map(wallet.balances.map((b) => [b.symbol, b.balance]));
    const balances: Balance[] = config.allocations.map((a) => ({
      symbol: a.symbol,
      amount: balanceBySymbol.get(a.symbol) ?? 0,
    }));
    return computePortfolio(config, balances, pricesQuery.prices);
  }, [config, pricesQuery.prices, wallet.balances, wallet.isConnected]);

  const hasHoldings = (portfolio?.totalValueUsd ?? 0) > 0;

  return {
    config,
    portfolio,
    prices: pricesQuery.prices,
    priceSource: pricesQuery.source,
    fetchedAt: pricesQuery.fetchedAt,
    walletAddress: wallet.address,
    isWalletConnected: wallet.isConnected,
    hasHoldings,
    isLoading: (pricesQuery.isLoading || wallet.isLoading) && !portfolio,
    isError: pricesQuery.isError || wallet.isError,
    error: pricesQuery.error,
    refetch: () => {
      pricesQuery.refetch();
      wallet.refetch();
    },
  };
}
