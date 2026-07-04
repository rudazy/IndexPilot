// Persistent rebalance activity log (client-side).
//
// Every completed rebalance execution (manual or auto-triggered) is recorded
// here and persisted to localStorage under `indexpilot.activityLog`, capped at
// 50 entries with the oldest dropped. A module-level pub/sub mirrors the
// apiCallLog pattern so the dashboard Activity card, the manual execution flow
// in RebalancePanel, and the auto-rebalance loop all see the same live list.

import type { OrderSide } from "./types";
import type { SodexNetwork } from "./sodexTypes";
import { uid } from "./utils";

const STORAGE_KEY = "indexpilot.activityLog";
const MAX_ENTRIES = 50;

export type FillStatus = "accepted" | "filled" | "pending" | "rejected";

export interface RebalanceActivityOrder {
  side: OrderSide;
  symbol: string;
  amountUsd: number;
  orderId: string | null;
}

export interface RebalanceActivityEntry {
  id: string;
  timestamp: number;
  network: SodexNetwork;
  /** How the execution was initiated. */
  trigger: "manual" | "auto";
  orders: RebalanceActivityOrder[];
  /** Total USD notional across executed orders. */
  totalUsd: number;
  /**
   * accepted: engine took the batch; filled: fills confirmed by polling;
   * pending: accepted but fill not confirmed within the polling window;
   * rejected: engine refused the batch.
   */
  fillStatus: FillStatus;
  /** Headline from the AI briefing that accompanied the plan, if any. */
  briefingHeadline: string | null;
}

const EMPTY: RebalanceActivityEntry[] = [];
let entries: RebalanceActivityEntry[] = EMPTY;
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
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* quota exceeded or private mode: the in-memory log still works */
  }
}

function isEntry(value: unknown): value is RebalanceActivityEntry {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Partial<RebalanceActivityEntry>;
  return (
    typeof v.id === "string" &&
    typeof v.timestamp === "number" &&
    (v.network === "mainnet" || v.network === "testnet") &&
    (v.trigger === "manual" || v.trigger === "auto") &&
    Array.isArray(v.orders) &&
    typeof v.totalUsd === "number" &&
    typeof v.fillStatus === "string"
  );
}

/**
 * Load persisted entries into the in-memory store. Idempotent; call from a
 * useEffect so SSR and the hydration render both see the empty list and no
 * hydration mismatch occurs.
 */
export function hydrateActivityLog(): void {
  if (hydrated || !isBrowser()) return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return;
    const valid = parsed.filter(isEntry).slice(0, MAX_ENTRIES);
    if (valid.length > 0) {
      entries = valid;
      emit();
    }
  } catch {
    /* corrupted blob: start fresh */
  }
}

export function getActivityEntries(): RebalanceActivityEntry[] {
  return entries;
}

export function getEmptyActivityEntries(): RebalanceActivityEntry[] {
  return EMPTY;
}

export function subscribeActivityLog(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function addActivityEntry(
  partial: Omit<RebalanceActivityEntry, "id" | "timestamp">,
): RebalanceActivityEntry {
  const entry: RebalanceActivityEntry = {
    id: uid("act"),
    timestamp: Date.now(),
    ...partial,
  };
  entries = [entry, ...entries].slice(0, MAX_ENTRIES);
  persist();
  emit();
  return entry;
}

/** Patch an existing entry (used by fill polling to upgrade accepted -> filled). */
export function updateActivityEntry(
  id: string,
  patch: Partial<Pick<RebalanceActivityEntry, "fillStatus" | "orders">>,
): void {
  const idx = entries.findIndex((e) => e.id === id);
  if (idx === -1) return;
  const next = [...entries];
  next[idx] = { ...next[idx], ...patch };
  entries = next;
  persist();
  emit();
}

export function clearActivityLog(): void {
  entries = EMPTY;
  persist();
  emit();
}
