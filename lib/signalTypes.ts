// Client-safe market-signal types and constants.
//
// The fetching + scoring implementation lives in `lib/sosovalue-signals.ts`,
// which is server-only (it holds the SoSoValue key usage). Client components
// and hooks import types and the urgency ranking from here.

export type RebalanceUrgency = "low" | "medium" | "high" | "urgent";

export const URGENCY_RANK: Record<RebalanceUrgency, number> = {
  low: 0,
  medium: 1,
  high: 2,
  urgent: 3,
};

export type SignalKind = "etf-flow" | "momentum";

export interface MarketSignal {
  /** Stable id, e.g. "btc-etf-flow" or "eth-momentum". */
  id: string;
  kind: SignalKind;
  symbol: string;
  label: string;
  /** One-day net flow in USD (etf-flow signals only). Negative = outflow. */
  flowUsd?: number;
  /** 24h price change in percent (momentum signals only). */
  changePct?: number;
  /** 0 calm, 1 notable, 2 strong, 3 extreme. */
  level: number;
  direction: "inflow" | "outflow" | "up" | "down" | "flat";
  /**
   * True when this signal is a stand-in for unavailable ETF flow data
   * (24h momentum used as the proxy). Always surfaced in the UI.
   */
  proxy: boolean;
  /** Human-readable one-liner, also fed to the AI briefing. */
  detail: string;
}

export interface SignalUpstreamCall {
  url: string;
  status: number;
  latencyMs: number;
  ok: boolean;
  error?: string;
}
