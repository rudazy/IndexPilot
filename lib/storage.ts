import type { IndexConfig, StoredAppState } from "./types";

const STORAGE_KEY = "indexpilot.state.v1";
const CURRENT_SCHEMA = 1 as const;

const emptyState: StoredAppState = {
  schemaVersion: CURRENT_SCHEMA,
  config: null,
};

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function freshState(): StoredAppState {
  return { ...emptyState };
}

function readRaw(): StoredAppState {
  if (!isBrowser()) return freshState();

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return freshState();

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isStoredState(parsed)) return freshState();
    if (parsed.schemaVersion !== CURRENT_SCHEMA) return freshState();
    // Legacy blobs may carry an `activity` array from before the log moved to
    // its own key (lib/activityLog.ts); it is dropped on the next write.
    return {
      schemaVersion: parsed.schemaVersion,
      config: parsed.config,
    };
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

export function resetAll(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function exportState(): StoredAppState {
  return readRaw();
}
