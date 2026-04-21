"use client";

import { useMemo } from "react";
import { generateRebalancePlan } from "@/lib/rebalance";
import type { PortfolioState, RebalancePlan } from "@/lib/types";

export function useRebalance(portfolio: PortfolioState | null): RebalancePlan | null {
  return useMemo(() => {
    if (!portfolio) return null;
    return generateRebalancePlan(portfolio);
  }, [portfolio]);
}
