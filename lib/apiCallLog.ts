export type ApiCallSource = "prices" | "briefing" | "sodex" | "signals";

export interface ApiCallEntry {
  id: string;
  source: ApiCallSource;
  timestamp: number;
  endpoint: string;
  upstreamUrl: string;
  status: number;
  ok: boolean;
  latencyMs: number;
  summary: string;
  detail?: string;
  tokens?: {
    input: number;
    output: number;
    cacheRead: number;
  };
}

const MAX_ENTRIES = 30;

let entries: ApiCallEntry[] = [];
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

let counter = 0;
function nextId(): string {
  counter += 1;
  return `c${Date.now().toString(36)}${counter.toString(36)}`;
}

export function addApiCall(
  partial: Omit<ApiCallEntry, "id" | "timestamp">,
): ApiCallEntry {
  const entry: ApiCallEntry = {
    id: nextId(),
    timestamp: Date.now(),
    ...partial,
  };
  entries = [entry, ...entries].slice(0, MAX_ENTRIES);
  emit();
  return entry;
}

export function clearApiCalls(): void {
  entries = [];
  emit();
}

export function getApiCalls(): ApiCallEntry[] {
  return entries;
}

export function subscribeApiCalls(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
