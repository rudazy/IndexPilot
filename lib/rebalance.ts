import type {
  DriftStatus,
  Holding,
  IndexConfig,
  PortfolioState,
  PriceSnapshot,
  RebalanceOrder,
  RebalancePlan,
  Token,
} from "./types";

const MILD_DRIFT_CEILING_PCT = 10;

export function assertAllocationsValid(config: IndexConfig): void {
  const { allocations } = config;
  if (allocations.length === 0) {
    throw new Error("Index must include at least one allocation.");
  }

  const total = allocations.reduce((sum, a) => sum + a.targetWeight, 0);
  if (Math.abs(total - 100) > 0.01) {
    throw new Error(`Allocations must sum to 100% (got ${total.toFixed(2)}%).`);
  }

  for (const a of allocations) {
    if (a.targetWeight <= 0 || a.targetWeight > 100) {
      throw new Error(`Weight for ${a.symbol} must be between 0 and 100.`);
    }
  }

  const seen = new Set<string>();
  for (const a of allocations) {
    if (seen.has(a.symbol)) {
      throw new Error(`Duplicate allocation for ${a.symbol}.`);
    }
    seen.add(a.symbol);
  }
}

export interface Balance {
  symbol: string;
  amount: number;
}

export function computePortfolio(
  config: IndexConfig,
  balances: Balance[],
  prices: PriceSnapshot[],
  now: number = Date.now(),
): PortfolioState {
  const priceBySymbol = new Map(prices.map((p) => [p.symbol, p.priceUsd]));
  const balanceBySymbol = new Map(balances.map((b) => [b.symbol, b.amount]));
  const targetBySymbol = new Map(
    config.allocations.map((a) => [a.symbol, a.targetWeight]),
  );

  const valued = config.allocations.map(({ symbol }) => {
    const balance = balanceBySymbol.get(symbol) ?? 0;
    const priceUsd = priceBySymbol.get(symbol) ?? 0;
    return { symbol, balance, priceUsd, valueUsd: balance * priceUsd };
  });

  const totalValueUsd = valued.reduce((sum, h) => sum + h.valueUsd, 0);

  const driftThresholdPct =
    config.trigger.kind === "drift" ? config.trigger.thresholdPct : 10;

  const holdings: Holding[] = valued.map((h) => {
    const currentWeight =
      totalValueUsd > 0 ? (h.valueUsd / totalValueUsd) * 100 : 0;
    const targetWeight = targetBySymbol.get(h.symbol) ?? 0;
    const driftPct = currentWeight - targetWeight;
    const absDrift = Math.abs(driftPct);
    const status = classifyDrift(absDrift, driftThresholdPct);

    return {
      symbol: h.symbol,
      balance: h.balance,
      priceUsd: h.priceUsd,
      valueUsd: h.valueUsd,
      currentWeight,
      targetWeight,
      driftPct,
      status,
    };
  });

  const needsRebalance = holdings.some((h) => h.status === "rebalance");

  return {
    totalValueUsd,
    holdings,
    needsRebalance,
    computedAt: now,
  };
}

function classifyDrift(absDrift: number, threshold: number): DriftStatus {
  if (absDrift >= threshold) return "rebalance";
  if (absDrift >= Math.min(MILD_DRIFT_CEILING_PCT, threshold)) return "mild";
  if (absDrift >= 1) return "mild";
  return "on-target";
}

export function generateRebalancePlan(
  portfolio: PortfolioState,
  now: number = Date.now(),
): RebalancePlan {
  const { totalValueUsd, holdings } = portfolio;

  if (totalValueUsd === 0) {
    return {
      orders: [],
      totalValueUsd,
      reason: "no-value",
      explanation: "Portfolio is empty. Deposit assets to begin indexing.",
      computedAt: now,
    };
  }

  const targetValueBySymbol = new Map<string, number>();
  for (const h of holdings) {
    targetValueBySymbol.set(h.symbol, (h.targetWeight / 100) * totalValueUsd);
  }

  const orders: RebalanceOrder[] = [];

  for (const h of holdings) {
    const targetValue = targetValueBySymbol.get(h.symbol) ?? 0;
    const deltaUsd = targetValue - h.valueUsd;
    if (Math.abs(deltaUsd) < 0.5) continue;
    if (h.priceUsd === 0) continue;

    const amountToken = Math.abs(deltaUsd) / h.priceUsd;
    orders.push({
      side: deltaUsd > 0 ? "buy" : "sell",
      symbol: h.symbol,
      amountToken,
      amountUsd: Math.abs(deltaUsd),
      priceUsd: h.priceUsd,
    });
  }

  orders.sort((a, b) => b.amountUsd - a.amountUsd);

  const explanation = buildExplanation(holdings, orders);
  const reason = orders.length === 0 ? "on-target" : "drift-above-threshold";

  return {
    orders,
    totalValueUsd,
    reason,
    explanation,
    computedAt: now,
  };
}

function buildExplanation(
  holdings: Holding[],
  orders: RebalanceOrder[],
): string {
  if (orders.length === 0) {
    return "Portfolio is within target weights. No action needed.";
  }

  const flagged = [...holdings]
    .filter((h) => h.status === "rebalance" || h.status === "mild")
    .sort((a, b) => Math.abs(b.driftPct) - Math.abs(a.driftPct));

  const headline =
    flagged.length > 0
      ? describeDrift(flagged[0])
      : "Weights have drifted from target.";

  const sell = orders.find((o) => o.side === "sell");
  const buy = orders.find((o) => o.side === "buy");

  if (sell && buy) {
    return `${headline} Selling ${formatAmount(sell.amountToken)} ${sell.symbol} and buying $${formatUsd(buy.amountUsd)} of ${buy.symbol} restores your index.`;
  }

  if (sell) {
    return `${headline} Trimming ${formatAmount(sell.amountToken)} ${sell.symbol} brings this asset back to target.`;
  }

  if (buy) {
    return `${headline} Adding $${formatUsd(buy.amountUsd)} of ${buy.symbol} brings this asset back to target.`;
  }

  return headline;
}

function describeDrift(h: Holding): string {
  const direction = h.driftPct > 0 ? "above" : "below";
  return `${h.symbol} drifted ${Math.abs(h.driftPct).toFixed(1)}% ${direction} target.`;
}

function formatAmount(n: number): string {
  if (n >= 1) return n.toFixed(3);
  if (n >= 0.001) return n.toFixed(5);
  return n.toExponential(2);
}

function formatUsd(n: number): string {
  return n.toFixed(2);
}

export function tokensFromConfig(
  config: IndexConfig,
  registry: Map<string, Token>,
): Token[] {
  return config.allocations
    .map((a) => registry.get(a.symbol))
    .filter((t): t is Token => t !== undefined);
}
