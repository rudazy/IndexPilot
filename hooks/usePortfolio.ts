"use client";

import { useEffect, useMemo, useState } from "react";
import { computePortfolio, type Balance } from "@/lib/rebalance";
import { loadConfig } from "@/lib/storage";
import type {
  IndexConfig,
  PortfolioState,
  PriceSnapshot,
} from "@/lib/types";
import type { SodexNetwork } from "@/lib/sodexTypes";
import { useSodexNetwork } from "@/contexts/SodexNetworkContext";
import { usePrices } from "./usePrices";
import { useWalletBalances } from "./useWalletBalances";
import { useSodexBalances } from "./useSodexBalances";

export interface UsePortfolioResult {
  config: IndexConfig | null;
  portfolio: PortfolioState | null;
  prices: PriceSnapshot[];
  priceSource: "sosovalue" | null;
  fetchedAt: number | null;
  walletAddress: `0x${string}` | undefined;
  isWalletConnected: boolean;
  hasHoldings: boolean;
  network: SodexNetwork;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function usePortfolio(): UsePortfolioResult {
  const [config, setConfig] = useState<IndexConfig | null>(null);
  const { network } = useSodexNetwork();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR-safe hydration from localStorage
    setConfig(loadConfig());
  }, []);

  const symbols = useMemo(
    () => config?.allocations.map((a) => a.symbol) ?? [],
    [config],
  );

  // On testnet, tradable funds live in the SoDEX account, not an external
  // wallet — so read balances from the account. Mainnet keeps reading the
  // connected wallet's ERC-20s on Ethereum.
  const useSodexSource = network === "testnet";

  const pricesQuery = usePrices(symbols);
  // On testnet the wallet reads are skipped entirely (enabled=false) — balances
  // come straight from the SoDEX account instead.
  const wallet = useWalletBalances(symbols, !useSodexSource);
  const sodex = useSodexBalances(network, useSodexSource && symbols.length > 0);

  const sourceBalances = useMemo(
    () =>
      useSodexSource
        ? sodex.balances.map((b) => ({ symbol: b.symbol, amount: b.amount }))
        : wallet.balances.map((b) => ({ symbol: b.symbol, amount: b.balance })),
    [useSodexSource, sodex.balances, wallet.balances],
  );

  // While the SoDEX balances load, treat the account as connected to avoid a
  // "connect wallet" flash; settle to the real readiness afterwards.
  const isConnected = useSodexSource
    ? sodex.isLoading || !!sodex.account?.ready
    : wallet.isConnected;
  const sourceAddress = useSodexSource
    ? (sodex.account?.address as `0x${string}` | undefined)
    : wallet.address;
  const sourceLoading = useSodexSource ? sodex.isLoading : wallet.isLoading;
  const sourceIsError = useSodexSource ? sodex.isError : wallet.isError;
  const sourceError = useSodexSource ? sodex.error : wallet.error;

  const portfolio = useMemo<PortfolioState | null>(() => {
    if (!config) return null;
    if (pricesQuery.prices.length === 0) return null;
    if (!isConnected) return null;

    const balanceBySymbol = new Map(sourceBalances.map((b) => [b.symbol, b.amount]));
    const balances: Balance[] = config.allocations.map((a) => ({
      symbol: a.symbol,
      amount: balanceBySymbol.get(a.symbol) ?? 0,
    }));
    return computePortfolio(config, balances, pricesQuery.prices);
  }, [config, pricesQuery.prices, sourceBalances, isConnected]);

  const hasHoldings = (portfolio?.totalValueUsd ?? 0) > 0;

  return {
    config,
    portfolio,
    prices: pricesQuery.prices,
    priceSource: pricesQuery.source,
    fetchedAt: pricesQuery.fetchedAt,
    walletAddress: sourceAddress,
    isWalletConnected: isConnected,
    hasHoldings,
    network,
    isLoading: (pricesQuery.isLoading || sourceLoading) && !portfolio,
    isError: pricesQuery.isError || sourceIsError,
    // Surface whichever subsystem actually failed (prices or balance reads) so
    // the dashboard shows a real message rather than "unknown error".
    error: pricesQuery.error ?? sourceError ?? null,
    refetch: () => {
      pricesQuery.refetch();
      wallet.refetch();
      sodex.refetch();
    },
  };
}
