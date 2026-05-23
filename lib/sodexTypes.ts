// Client-safe SoDEX types and constants.
//
// This module contains NO signing logic and NO secrets, so it is safe to import
// from client components and hooks. The actual REST client + EIP-712 signing
// lives in `lib/sodex.ts`, which is server-only.

import type { OrderSide } from "./types";

export const SODEX_APP_URL = "https://sodex.com";

export type SodexNetwork = "mainnet" | "testnet";

/** One leg of a rebalance plan as mapped onto a SoDEX spot market. */
export interface SodexQuote {
  /** Index token symbol, e.g. "BTC". */
  symbol: string;
  /** SoDEX market display name, e.g. "BTC/USDC". null when no market matched. */
  market: string | null;
  /** SoDEX numeric symbol id used in the order payload. */
  symbolId: number | null;
  side: OrderSide;
  /** Always a market order in the rebalance flow. */
  orderType: "market";
  /**
   * For a market SELL: base-asset quantity to sell (e.g. "0.0123" BTC).
   * For a market BUY: omitted (we spend `funds` instead).
   */
  quantity: string | null;
  /**
   * For a market BUY: quote-asset funds to spend, in USDC (e.g. "1840.50").
   * For a market SELL: omitted.
   */
  funds: string | null;
  /** Client order id we generate; echoed back by the engine for correlation. */
  clOrdId: string;
  /** Reference price (SoSoValue), used only for the estimate; market orders fill at the live book. */
  estPriceUsd: number;
  /** Estimated notional in USD. */
  estNotionalUsd: number;
  /** Estimated taker fee in USD (notional * takerFee). */
  estFeeUsd: number;
  /** Whether this leg can actually be submitted. */
  tradable: boolean;
  /** Why a leg is not tradable (USDC cash leg, no market, below $5 minNotional, dust). */
  skipReason?: string;
}

export interface SodexAccountInfo {
  /** Address the account state was looked up against. */
  address: string;
  /** Account id from the engine. 0 means no SoDEX spot account exists for this address. */
  accountId: number;
  /** True when accountId > 0 and orders can be placed. */
  ready: boolean;
}

export interface SodexUpstreamCall {
  url: string;
  status: number;
  latencyMs: number;
  ok: boolean;
  error?: string;
}

export interface SodexQuoteResponse {
  network: SodexNetwork;
  quotes: SodexQuote[];
  account: SodexAccountInfo | null;
  /** Total estimated notional across tradable legs. */
  totalNotionalUsd: number;
  meta: {
    upstreamCalls: SodexUpstreamCall[];
    totalLatencyMs: number;
  };
}

/** Result of placing a single order leg. */
export interface SodexOrderResult {
  clOrdId: string;
  symbol: string;
  side: OrderSide;
  /** Engine order id when returned. */
  orderId: string | null;
  /** Engine status string when returned, e.g. "NEW", "FILLED", "REJECTED". */
  status: string | null;
  /** Raw per-order object from the engine, for inspection. */
  raw: unknown;
}

export interface SodexExecuteResponse {
  network: SodexNetwork;
  /** Engine envelope code; 0 means accepted. */
  code: number;
  message: string;
  account: SodexAccountInfo;
  results: SodexOrderResult[];
  /** Raw `data` field from the engine response. */
  raw: unknown;
  meta: {
    upstreamCalls: SodexUpstreamCall[];
    totalLatencyMs: number;
  };
}
