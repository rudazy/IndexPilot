import type {
  ActivityEvent,
  IndexConfig,
  SimulatedHoldings,
  StoredAppState,
} from "./types";

const STORAGE_KEY = "indexpilot.state.v1";
const CURRENT_SCHEMA = 1 as const;
const MAX_ACTIVITY_EVENTS = 200;

const emptyState: StoredAppState = {
  schemaVersion: CURRENT_SCHEMA,
  config: null,
  activity: [],
  holdings: null,
};

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function freshState(): StoredAppState {
  return { ...emptyState, activity: [], holdings: null };
}

function readRaw(): StoredAppState {
  if (!isBrowser()) return freshState();

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return freshState();

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isStoredState(parsed)) return freshState();
    if (parsed.schemaVersion !== CURRENT_SCHEMA) return freshState();
    return parsed;
  } catch {
    return freshState();
  }
}

function writeRaw(state: StoredAppState): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function isStoredState(value: unknown): value is StoredAppState {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Partial<StoredAppState>;
  return (
    typeof v.schemaVersion === "number" &&
    Array.isArray(v.activity) &&
    (v.config === null || typeof v.config === "object")
  );
}

export function loadConfig(): IndexConfig | null {
  return readRaw().config;
}

export function saveConfig(config: IndexConfig): void {
  const state = readRaw();
  writeRaw({ ...state, config });
}

export function clearConfig(): void {
  const state = readRaw();
  writeRaw({ ...state, config: null });
}

export function loadActivity(): ActivityEvent[] {
  return readRaw().activity;
}

export function appendActivity(event: ActivityEvent): ActivityEvent[] {
  const state = readRaw();
  const next = [event, ...state.activity].slice(0, MAX_ACTIVITY_EVENTS);
  writeRaw({ ...state, activity: next });
  return next;
}

export function clearActivity(): void {
  const state = readRaw();
  writeRaw({ ...state, activity: [] });
}

export function resetAll(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function loadHoldings(): SimulatedHoldings | null {
  return readRaw().holdings;
}

export function saveHoldings(holdings: SimulatedHoldings): void {
  const state = readRaw();
  writeRaw({ ...state, holdings });
}

export function clearHoldings(): void {
  const state = readRaw();
  writeRaw({ ...state, holdings: null });
}

export function exportState(): StoredAppState {
  return readRaw();
}
