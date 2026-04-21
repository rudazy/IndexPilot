import type { RebalanceOrder, RebalancePlan } from "./types";

export interface SodexQuote {
  orderId: string;
  inputSymbol: string;
  outputSymbol: string;
  inputAmount: number;
  expectedOutput: number;
  priceImpactPct: number;
  feeUsd: number;
  expiresAt: number;
}

export interface SodexExecutionReceipt {
  orderId: string;
  txHash: `0x${string}`;
  filledInput: number;
  filledOutput: number;
  executedAt: number;
}

export interface SodexClient {
  quoteOrder(order: RebalanceOrder): Promise<SodexQuote>;
  executeOrder(quote: SodexQuote): Promise<SodexExecutionReceipt>;
  quotePlan(plan: RebalancePlan): Promise<SodexQuote[]>;
}

export const SODEX_APP_URL = "https://sodex.com";

export function createSodexClient(): SodexClient {
  throw new Error(
    "SoDEX client is not yet enabled. Trading API access is pending; the integration will be wired when credentials are available.",
  );
}

export function buildSodexDeeplink(plan: RebalancePlan): string {
  void plan;
  return SODEX_APP_URL;
}
