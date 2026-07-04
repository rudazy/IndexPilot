// Auto-rebalance preference (client-side).
//
// Persisted under `indexpilot.autoRebalance`. `mainnetConfirmed` records that
// the user explicitly acknowledged the mainnet confirmation modal when
// enabling; the execution loop refuses to fire on mainnet without it, even if
// the user enabled auto mode on testnet and switched networks afterwards.

const STORAGE_KEY = "indexpilot.autoRebalance";

export const DEFAULT_AUTO_INTERVAL_MS = 5 * 60 * 1000;

/** Poll cadences offered in the setup UI. */
export const AUTO_INTERVAL_OPTIONS_MS = [
  5 * 60 * 1000,
  15 * 60 * 1000,
  60 * 60 * 1000,
] as const;

export interface AutoRebalanceSettings {
  enabled: boolean;
  /** Drift polling cadence in milliseconds. */
  intervalMs: number;
  /** True only when the user confirmed the mainnet warning modal. */
  mainnetConfirmed: boolean;
}

const DEFAULT_SETTINGS: AutoRebalanceSettings = {
  enabled: false,
  intervalMs: DEFAULT_AUTO_INTERVAL_MS,
  mainnetConfirmed: false,
};

let settings: AutoRebalanceSettings = DEFAULT_SETTINGS;
let hydrated = false;
const listeners = new Set<() => void>();

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function emit(): void {
  listeners.forEach((l) => l());
}

function isSettings(value: unknown): value is AutoRebalanceSettings {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Partial<AutoRebalanceSettings>;
  return (
    typeof v.enabled === "boolean" &&
    typeof v.intervalMs === "number" &&
    Number.isFinite(v.intervalMs) &&
    v.intervalMs >= 60 * 1000 &&
    typeof v.mainnetConfirmed === "boolean"
  );
}

export function hydrateAutoRebalanceSettings(): void {
  if (hydrated || !isBrowser()) return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as unknown;
    if (isSettings(parsed)) {
      settings = parsed;
      emit();
    }
  } catch {
    /* corrupted blob: keep defaults */
  }
}

export function getAutoRebalanceSettings(): AutoRebalanceSettings {
  return settings;
}

export function getDefaultAutoRebalanceSettings(): AutoRebalanceSettings {
  return DEFAULT_SETTINGS;
}

export function subscribeAutoRebalanceSettings(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function saveAutoRebalanceSettings(next: AutoRebalanceSettings): void {
  settings = next;
  if (isBrowser()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* private mode: setting just will not persist */
    }
  }
  emit();
}
