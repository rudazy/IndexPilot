"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { addApiCall } from "@/lib/apiCallLog";
import type {
  SodexAccountBalance,
  SodexAccountInfo,
  SodexBalancesResponse,
  SodexNetwork,
} from "@/lib/sodexTypes";

const STALE_MS = 60 * 1000;

export interface UseSodexBalancesResult {
  balances: SodexAccountBalance[];
  account: SodexAccountInfo | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Read the SoDEX account spot balances for the given network. Used as the
 * portfolio balance source on testnet, where funds live in the SoDEX account
 * rather than an external wallet.
 */
export function useSodexBalances(
  network: SodexNetwork,
  enabled: boolean,
): UseSodexBalancesResult {
  const query = useQuery<SodexBalancesResponse, Error>({
    queryKey: ["sodex-balances", network],
    enabled,
    staleTime: STALE_MS,
    refetchInterval: STALE_MS,
    queryFn: async () => {
      const res = await fetch("/api/sodex", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ action: "balances", network }),
      });
      if (!res.ok) {
        let detail = "";
        try {
          const body = (await res.json()) as { error?: string };
          detail = body.error ?? "";
        } catch {
          detail = await res.text();
        }
        throw new Error(detail || `SoDEX balances request failed (${res.status})`);
      }
      return (await res.json()) as SodexBalancesResponse;
    },
  });

  const lastLoggedAt = useRef<number | null>(null);
  useEffect(() => {
    if (!query.data || !query.dataUpdatedAt) return;
    if (lastLoggedAt.current === query.dataUpdatedAt) return;
    lastLoggedAt.current = query.dataUpdatedAt;
    const { account, balances, meta } = query.data;
    addApiCall({
      source: "sodex",
      endpoint: "/api/sodex (balances)",
      upstreamUrl: meta.upstreamCalls[meta.upstreamCalls.length - 1]?.url ?? "/api/sodex",
      status: 200,
      ok: true,
      latencyMs: meta.totalLatencyMs,
      summary: `balances · account ${account.accountId} · ${balances.length} assets · ${query.data.network}`,
    });
  }, [query.data, query.dataUpdatedAt]);

  useEffect(() => {
    if (!query.error) return;
    addApiCall({
      source: "sodex",
      endpoint: "/api/sodex (balances)",
      upstreamUrl: "(failed)",
      status: 0,
      ok: false,
      latencyMs: 0,
      summary: "balances request failed",
      detail: query.error.message,
    });
  }, [query.error]);

  return {
    balances: query.data?.balances ?? [],
    account: query.data?.account ?? null,
    isLoading: query.isLoading && enabled,
    isError: query.isError,
    error: query.error ?? null,
    refetch: () => {
      void query.refetch();
    },
  };
}
