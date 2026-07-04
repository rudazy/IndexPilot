// Portfolio value history (client-side).
//
// On every price refresh the dashboard records a snapshot of total portfolio
// value into localStorage under `indexpilot.valueHistory`. Snapshots are taken
// at most once per 5 minutes and kept for 7 days (2016 points max), which is
// small enough for localStorage and dense enough for a meaningful line chart.
//
// Each snapshot also carries a computed "target" value: what the portfolio
// would be worth now if it had been perfectly rebalanced to target weights at
// the baseline moment and then held. The baseline (total value + prices at t0)
// is stored per network and resets whenever the index composition changes,
// because the hypothetical becomes incomparable across different weight sets.

import type { SodexNetwork } from "./sodexTypes";

const STORAGE_KEY = "indexpilot.valueHistory";
const SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000;
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_POINTS = 2016;
// Accept a snapshot slightly early so a refresh cycle that runs at 4m59s
// does not skip an entire interval.
const INTERVAL_TOLERANCE_MS = 10 * 1000;

export interface ValueHistoryPoint {
  /** Snapshot time (ms epoch). */
  t: number;
  /** Actual portfolio value in USD. */
  actualUsd: number;
  /**
   * Value of the hypothetical perfectly-balanced portfolio (rebalanced to
   * target weights at the baseline, then held). Null when a price needed for
   * the computation was missing at snapshot time.
   */
  targetUsd: number | null;
  network: SodexNetwork;
}

interface ValueHistoryBaseline {
  t0: number;
  totalUsd0: number;
  /** Target weights (percent) at baseline, keyed by symbol. */
  weights: Record<string, number>;
  /** Prices at baseline, keyed by symbol. */
  prices0: Record<string, number>;
}

interface StoredValueHistory {
  baselines: Partial<Record<SodexNetwork, ValueHistoryBaseline>>;
  points: ValueHistoryPoint[];
}

const EMPTY_POINTS: ValueHistoryPoint[] = [];
let store: StoredValueHistory = { baselines: {}, points: EMPTY_POINTS };
let hydrated = false;
const listeners = new Set<() => void>();

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function emit(): void {
  listeners.forEach((l) => l());
}

function persist(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* quota exceeded or private mode: history just will not persist */
  }
}

function isPoint(value: unknown): value is ValueHistoryPoint {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Partial<ValueHistoryPoint>;
  return (
    typeof v.t === "number" &&
    typeof v.actualUsd === "number" &&
    (typeof v.targetUsd === "number" || v.targetUsd === null) &&
    (v.network === "mainnet" || v.network === "testnet")
  );
}

export function hydrateValueHistory(): void {
  if (hydrated || !isBrowser()) return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<StoredValueHistory>;
    const points = Array.isArray(parsed.points) ? parsed.points.filter(isPoint) : [];
    const baselines =
      typeof parsed.baselines === "object" && parsed.baselines !== null
        ? parsed.baselines
        : {};
    store = { baselines, points };
    if (points.length > 0) emit();
  } catch {
    /* corrupted blob: start fresh */
  }
}

export function getValueHistoryPoints(): ValueHistoryPoint[] {
  return store.points;
}

export function getEmptyValueHistoryPoints(): ValueHistoryPoint[] {
  return EMPTY_POINTS;
}

export function subscribeValueHistory(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function weightsChanged(
  a: Record<string, number>,
  b: Record<string, number>,
): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return true;
  return aKeys.some((k) => a[k] !== b[k]);
}

function computeTargetUsd(
  baseline: ValueHistoryBaseline,
  pricesNow: Record<string, number>,
): number | null {
  let total = 0;
  for (const [symbol, weight] of Object.entries(baseline.weights)) {
    const p0 = baseline.prices0[symbol];
    const pNow = pricesNow[symbol];
    if (!p0 || !pNow) return null;
    // USD allocated to this leg at baseline, marked to the current price.
    total += ((weight / 100) * baseline.totalUsd0 * pNow) / p0;
  }
  return total;
}

export interface SnapshotInput {
  totalValueUsd: number;
  /** Current prices keyed by symbol. */
  prices: Record<string, number>;
  /** Target weights (percent) keyed by symbol. */
  weights: Record<string, number>;
  network: SodexNetwork;
}

/**
 * Record a snapshot if the per-network interval has elapsed. Returns true when
 * a point was written. Also (re)establishes the baseline when none exists for
 * the network or when the index composition changed.
 */
export function recordValueSnapshot(input: SnapshotInput, now: number = Date.now()): boolean {
  if (!isBrowser()) return false;
  hydrateValueHistory();
  if (input.totalValueUsd <= 0) return false;

  const { network } = input;
  let baseline = store.baselines[network];
  let baselineReset = false;
  if (!baseline || weightsChanged(baseline.weights, input.weights)) {
    baseline = {
      t0: now,
      totalUsd0: input.totalValueUsd,
      weights: { ...input.weights },
      prices0: { ...input.prices },
    };
    baselineReset = true;
  }

  const lastForNetwork = store.points.find((p) => p.network === network);
  const intervalElapsed =
    !lastForNetwork || now - lastForNetwork.t >= SNAPSHOT_INTERVAL_MS - INTERVAL_TOLERANCE_MS;
  if (!intervalElapsed && !baselineReset) return false;

  const point: ValueHistoryPoint = {
    t: now,
    actualUsd: input.totalValueUsd,
    targetUsd: computeTargetUsd(baseline, input.prices),
    network,
  };

  const cutoff = now - RETENTION_MS;
  const points = [point, ...store.points.filter((p) => p.t >= cutoff)].slice(0, MAX_POINTS);

  store = {
    baselines: { ...store.baselines, [network]: baseline },
    points,
  };
  persist();
  emit();
  return true;
}

export function clearValueHistory(): void {
  store = { baselines: {}, points: EMPTY_POINTS };
  persist();
  emit();
}
