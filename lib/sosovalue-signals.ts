// SoSoValue market signal layer (server-only).
//
// Fetches timing signals beyond raw prices and folds them into a single
// RebalanceUrgency score. Two signal families:
//
//   1. Spot ETF net flows (BTC + ETH) from the v2 ETF endpoints. Institutional
//      flow is the strongest timing signal SoSoValue exposes: a large one-day
//      net inflow or outflow means the market is repricing and drift is likely
//      to widen rather than mean-revert.
//   2. 24h price momentum from the v1 market-snapshot endpoint (same endpoint
//      the price feed uses). Momentum doubles as the documented PROXY when the
//      ETF endpoints are not available on the account's API plan: the signal is
//      still computed, but flagged `proxy: true` so the UI labels it honestly.
//
// The urgency score feeds three consumers: the Market Signal chip on the
// dashboard hero, the AI briefing prompt, and the auto-rebalance gate (which
// only fires at medium or above).

import "server-only";
import { findTokenBySymbol } from "./tokens";
import type {
  MarketSignal,
  RebalanceUrgency,
  SignalUpstreamCall,
} from "./signalTypes";

export type {
  MarketSignal,
  RebalanceUrgency,
  SignalKind,
  SignalUpstreamCall,
} from "./signalTypes";

const SOSOVALUE_V1_BASE = "https://openapi.sosovalue.com/openapi/v1";
const SOSOVALUE_V2_BASE = "https://openapi.sosovalue.com/openapi/v2";

/** ETF products SoSoValue tracks that map onto index assets. */
const ETF_PRODUCTS = [
  { symbol: "BTC", type: "us-btc-spot", label: "BTC spot ETF" },
  { symbol: "ETH", type: "us-eth-spot", label: "ETH spot ETF" },
] as const;

// --- Tunable scoring thresholds --------------------------------------------
// Exported so the scoring model is inspectable and adjustable in one place.

export const SIGNAL_THRESHOLDS = {
  /** Absolute one-day ETF net flow (USD) mapped to level 1 / 2 / 3. */
  flowUsd: { notable: 100_000_000, strong: 500_000_000, extreme: 1_000_000_000 },
  /** Absolute 24h price change (percent) mapped to level 1 / 2 / 3. */
  momentumPct: { notable: 2, strong: 5, extreme: 8 },
} as const;

const URGENCY_BY_LEVEL: RebalanceUrgency[] = ["low", "medium", "high", "urgent"];

export interface MarketSignalsResult {
  urgency: RebalanceUrgency;
  /** Highest signal level observed (0-3); urgency is derived from it. */
  score: number;
  signals: MarketSignal[];
  /** True when any etf-flow signal had to fall back to the momentum proxy. */
  usedProxy: boolean;
  computedAt: number;
  upstreamCalls: SignalUpstreamCall[];
}

// --- Upstream fetch helpers -------------------------------------------------

function timed(): { mark: (c: Omit<SignalUpstreamCall, "latencyMs">) => SignalUpstreamCall } {
  const startedAt = Date.now();
  return { mark: (c) => ({ ...c, latencyMs: Date.now() - startedAt }) };
}

interface SosovalueEnvelope<T> {
  code?: number;
  message?: string;
  data?: T;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/**
 * Extract the most recent one-day net inflow from the historicalInflowChart
 * response. The documented item shape is { date, totalNetInflow, ... } but the
 * parser tolerates the field-name variants SoSoValue has used elsewhere.
 * Returns null when nothing parseable is found (caller falls back to proxy).
 */
function extractLatestNetInflow(data: unknown): { flowUsd: number; date: string | null } | null {
  const list = Array.isArray(data)
    ? data
    : typeof data === "object" && data !== null && Array.isArray((data as { list?: unknown[] }).list)
      ? (data as { list: unknown[] }).list
      : null;
  if (!list || list.length === 0) return null;

  for (let i = list.length - 1; i >= 0; i -= 1) {
    const item = list[i] as Record<string, unknown>;
    if (typeof item !== "object" || item === null) continue;
    const flow =
      toNumber(item.totalNetInflow) ??
      toNumber(item.dailyNetInflow) ??
      toNumber(item.netInflow);
    if (flow === null) continue;
    const date =
      typeof item.date === "string"
        ? item.date
        : typeof item.dataDate === "string"
          ? item.dataDate
          : null;
    return { flowUsd: flow, date };
  }
  return null;
}

async function fetchEtfNetFlow(
  type: string,
  apiKey: string,
  calls: SignalUpstreamCall[],
): Promise<{ flowUsd: number; date: string | null } | null> {
  const url = `${SOSOVALUE_V2_BASE}/etf/historicalInflowChart`;
  const t = timed();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-soso-api-key": apiKey },
      body: JSON.stringify({ type }),
      cache: "no-store",
    });
    if (!res.ok) {
      calls.push(t.mark({ url, status: res.status, ok: false, error: `HTTP ${res.status}` }));
      return null;
    }
    const envelope = (await res.json()) as SosovalueEnvelope<unknown>;
    if (envelope.code !== 0 || envelope.data == null) {
      calls.push(
        t.mark({
          url,
          status: res.status,
          ok: false,
          error: `envelope code ${envelope.code ?? "missing"}: ${envelope.message ?? ""}`.trim(),
        }),
      );
      return null;
    }
    const latest = extractLatestNetInflow(envelope.data);
    calls.push(
      t.mark({
        url,
        status: res.status,
        ok: latest !== null,
        error: latest === null ? "no parseable net-inflow field" : undefined,
      }),
    );
    return latest;
  } catch (err) {
    calls.push(
      t.mark({ url, status: 0, ok: false, error: err instanceof Error ? err.message : "network error" }),
    );
    return null;
  }
}

async function fetchChange24h(
  symbol: string,
  apiKey: string,
  calls: SignalUpstreamCall[],
): Promise<number | null> {
  const currencyId = findTokenBySymbol(symbol)?.sosovalueCurrencyId;
  if (!currencyId) return null;
  const url = `${SOSOVALUE_V1_BASE}/currencies/${encodeURIComponent(currencyId)}/market-snapshot`;
  const t = timed();
  try {
    const res = await fetch(url, {
      headers: { "x-soso-api-key": apiKey },
      cache: "no-store",
    });
    if (!res.ok) {
      calls.push(t.mark({ url, status: res.status, ok: false, error: `HTTP ${res.status}` }));
      return null;
    }
    const envelope = (await res.json()) as SosovalueEnvelope<{ change_pct_24h?: number | string }>;
    if (envelope.code !== 0 || !envelope.data) {
      calls.push(
        t.mark({ url, status: res.status, ok: false, error: `envelope code ${envelope.code ?? "missing"}` }),
      );
      return null;
    }
    const fraction = toNumber(envelope.data.change_pct_24h);
    calls.push(t.mark({ url, status: res.status, ok: fraction !== null }));
    // Upstream reports a fraction (0.041 = +4.1%); normalise to percent.
    return fraction === null ? null : fraction * 100;
  } catch (err) {
    calls.push(
      t.mark({ url, status: 0, ok: false, error: err instanceof Error ? err.message : "network error" }),
    );
    return null;
  }
}

// --- Scoring ----------------------------------------------------------------

function flowLevel(flowUsd: number): number {
  const abs = Math.abs(flowUsd);
  const { notable, strong, extreme } = SIGNAL_THRESHOLDS.flowUsd;
  if (abs >= extreme) return 3;
  if (abs >= strong) return 2;
  if (abs >= notable) return 1;
  return 0;
}

function momentumLevel(changePct: number): number {
  const abs = Math.abs(changePct);
  const { notable, strong, extreme } = SIGNAL_THRESHOLDS.momentumPct;
  if (abs >= extreme) return 3;
  if (abs >= strong) return 2;
  if (abs >= notable) return 1;
  return 0;
}

function formatFlowUsd(flowUsd: number): string {
  const abs = Math.abs(flowUsd);
  if (abs >= 1_000_000_000) return `$${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(0)}M`;
  return `$${abs.toFixed(0)}`;
}

function flowSignal(symbol: string, label: string, flowUsd: number, date: string | null): MarketSignal {
  const direction = flowUsd > 0 ? "inflow" : flowUsd < 0 ? "outflow" : "flat";
  return {
    id: `${symbol.toLowerCase()}-etf-flow`,
    kind: "etf-flow",
    symbol,
    label: `${label} net flow (1d)`,
    flowUsd,
    level: flowLevel(flowUsd),
    direction,
    proxy: false,
    detail: `${label} saw ${formatFlowUsd(flowUsd)} net ${direction === "flat" ? "flow" : direction}${date ? ` on ${date}` : ""}.`,
  };
}

function momentumSignal(symbol: string, changePct: number, asProxy: boolean): MarketSignal {
  const direction = changePct > 0.05 ? "up" : changePct < -0.05 ? "down" : "flat";
  return {
    id: `${symbol.toLowerCase()}-momentum${asProxy ? "-proxy" : ""}`,
    kind: "momentum",
    symbol,
    label: asProxy ? `${symbol} 24h momentum (ETF flow proxy)` : `${symbol} 24h momentum`,
    changePct,
    level: momentumLevel(changePct),
    direction,
    proxy: asProxy,
    detail: `${symbol} moved ${changePct >= 0 ? "+" : ""}${changePct.toFixed(1)}% over 24h${asProxy ? " (used as ETF flow proxy)" : ""}.`,
  };
}

// --- Entry point ------------------------------------------------------------

/**
 * Fetch all timing signals and compute the combined urgency. `symbols` is the
 * user's index composition; momentum is computed for each of them, ETF flows
 * only for the assets that actually have US spot ETFs (BTC, ETH).
 *
 * Never throws on upstream failure: a leg that cannot be fetched is either
 * replaced by the labeled momentum proxy (ETF flows) or dropped (momentum).
 */
export async function fetchMarketSignals(
  symbols: string[],
  apiKey: string,
): Promise<MarketSignalsResult> {
  const calls: SignalUpstreamCall[] = [];
  const wanted = symbols.map((s) => s.toUpperCase());
  const signals: MarketSignal[] = [];
  let usedProxy = false;

  // Momentum for every index asset except the stable cash leg.
  const momentumSymbols = wanted.filter((s) => s !== "USDC");

  const [flowResults, momentumResults] = await Promise.all([
    Promise.all(
      ETF_PRODUCTS.filter((p) => wanted.includes(p.symbol)).map(async (p) => ({
        product: p,
        flow: await fetchEtfNetFlow(p.type, apiKey, calls),
      })),
    ),
    Promise.all(
      momentumSymbols.map(async (symbol) => ({
        symbol,
        changePct: await fetchChange24h(symbol, apiKey, calls),
      })),
    ),
  ]);

  const momentumBySymbol = new Map(
    momentumResults.filter((m) => m.changePct !== null).map((m) => [m.symbol, m.changePct as number]),
  );

  for (const { product, flow } of flowResults) {
    if (flow !== null) {
      signals.push(flowSignal(product.symbol, product.label, flow.flowUsd, flow.date));
    } else {
      // ETF endpoint unavailable (plan limit or outage): substitute the
      // momentum reading for the same asset, clearly labeled as a proxy.
      const changePct = momentumBySymbol.get(product.symbol);
      if (changePct !== undefined) {
        usedProxy = true;
        signals.push(momentumSignal(product.symbol, changePct, true));
        momentumBySymbol.delete(product.symbol); // avoid a duplicate plain-momentum entry
      }
    }
  }

  for (const [symbol, changePct] of momentumBySymbol) {
    signals.push(momentumSignal(symbol, changePct, false));
  }

  signals.sort((a, b) => b.level - a.level || a.symbol.localeCompare(b.symbol));

  const score = signals.reduce((max, s) => Math.max(max, s.level), 0);

  return {
    urgency: URGENCY_BY_LEVEL[score] ?? "low",
    score,
    signals,
    usedProxy,
    computedAt: Date.now(),
    upstreamCalls: calls,
  };
}
