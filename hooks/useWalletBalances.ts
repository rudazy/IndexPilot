"use client";

import { useMemo } from "react";
import { useAccount, useBalance, useReadContracts } from "wagmi";
import { mainnet } from "wagmi/chains";
import { erc20Abi, formatUnits } from "viem";
import { findTokenBySymbol } from "@/lib/tokens";

export interface WalletBalance {
  symbol: string;
  balance: number;
  rawBalance: bigint | null;
  decimals: number;
}

export interface UseWalletBalancesResult {
  address: `0x${string}` | undefined;
  isConnected: boolean;
  balances: WalletBalance[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function useWalletBalances(symbols: string[]): UseWalletBalancesResult {
  const { address, isConnected } = useAccount();

  const requested = useMemo(
    () =>
      symbols
        .map((s) => findTokenBySymbol(s))
        .filter((t): t is NonNullable<ReturnType<typeof findTokenBySymbol>> => !!t),
    [symbols],
  );

  const ethToken = requested.find((t) => t.isNative);
  const erc20Tokens = useMemo(
    () => requested.filter((t) => !t.isNative && !!t.address),
    [requested],
  );

  const ethBalance = useBalance({
    address,
    chainId: mainnet.id,
    query: { enabled: !!address && !!ethToken },
  });

  const erc20Reads = useReadContracts({
    contracts: erc20Tokens.map((t) => ({
      address: t.address as `0x${string}`,
      abi: erc20Abi,
      functionName: "balanceOf" as const,
      args: [address ?? "0x0000000000000000000000000000000000000000"] as readonly [
        `0x${string}`,
      ],
      chainId: mainnet.id,
    })),
    query: { enabled: !!address && erc20Tokens.length > 0 },
  });

  const balances = useMemo<WalletBalance[]>(() => {
    return requested.map((t) => {
      if (t.isNative) {
        const raw = ethBalance.data?.value ?? null;
        const human = raw !== null ? Number(formatUnits(raw, t.decimals)) : 0;
        return {
          symbol: t.symbol,
          balance: human,
          rawBalance: raw,
          decimals: t.decimals,
        };
      }
      const idx = erc20Tokens.findIndex((e) => e.symbol === t.symbol);
      const result = erc20Reads.data?.[idx]?.result;
      const raw = typeof result === "bigint" ? result : null;
      const human = raw !== null ? Number(formatUnits(raw, t.decimals)) : 0;
      return {
        symbol: t.symbol,
        balance: human,
        rawBalance: raw,
        decimals: t.decimals,
      };
    });
  }, [requested, erc20Tokens, ethBalance.data, erc20Reads.data]);

  const isLoading =
    (!!ethToken && ethBalance.isLoading) ||
    (erc20Tokens.length > 0 && erc20Reads.isLoading);

  const isError =
    (!!ethToken && ethBalance.isError) ||
    (erc20Tokens.length > 0 && erc20Reads.isError);

  return {
    address,
    isConnected,
    balances,
    isLoading,
    isError,
    refetch: () => {
      void ethBalance.refetch();
      void erc20Reads.refetch();
    },
  };
}
