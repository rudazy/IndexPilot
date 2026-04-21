export type TokenSymbol = string;

export interface Token {
  symbol: TokenSymbol;
  name: string;
  address?: `0x${string}`;
  decimals: number;
  logoUrl?: string;
}

export interface IndexAllocation {
  symbol: TokenSymbol;
  targetWeight: number;
}

export type RebalanceTriggerKind = "time" | "drift";

export type TimeInterval = "daily" | "weekly";

export interface TimeTrigger {
  kind: "time";
  interval: TimeInterval;
}

export interface DriftTrigger {
  kind: "drift";
  thresholdPct: number;
}

export type RebalanceTrigger = TimeTrigger | DriftTrigger;

export interface IndexConfig {
  schemaVersion: 1;
  name: string;
  createdAt: number;
  updatedAt: number;
  baseCurrency: "USD";
  allocations: IndexAllocation[];
  trigger: RebalanceTrigger;
}

export interface PriceSnapshot {
  symbol: TokenSymbol;
  priceUsd: number;
  change24hPct: number;
  fetchedAt: number;
  source: "sosovalue" | "coingecko" | "mock";
}

export interface Holding {
  symbol: TokenSymbol;
  balance: number;
  priceUsd: number;
  valueUsd: number;
  currentWeight: number;
  targetWeight: number;
  driftPct: number;
  status: DriftStatus;
}

export type DriftStatus = "on-target" | "mild" | "rebalance";

export interface PortfolioState {
  totalValueUsd: number;
  holdings: Holding[];
  needsRebalance: boolean;
  computedAt: number;
}

export type OrderSide = "buy" | "sell";

export interface RebalanceOrder {
  side: OrderSide;
  symbol: TokenSymbol;
  amountToken: number;
  amountUsd: number;
  priceUsd: number;
}

export interface RebalancePlan {
  orders: RebalanceOrder[];
  totalValueUsd: number;
  reason: string;
  explanation: string;
  computedAt: number;
}

export interface ActivityEvent {
  id: string;
  timestamp: number;
  kind: "drift-detected" | "rebalance-proposed" | "rebalance-executed" | "config-updated";
  summary: string;
  explanation?: string;
  plan?: RebalancePlan;
}

export interface SimulatedHoldings {
  schemaVersion: 1;
  startingValueUsd: number;
  createdAt: number;
  balances: Record<string, number>;
}

export interface StoredAppState {
  schemaVersion: 1;
  config: IndexConfig | null;
  activity: ActivityEvent[];
  holdings: SimulatedHoldings | null;
}
