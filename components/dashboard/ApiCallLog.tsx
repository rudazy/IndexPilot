"use client";

import { useState, useSyncExternalStore, useCallback } from "react";
import {
  ChevronDown,
  ChevronRight,
  Circle,
  Trash2,
  Database,
  Sparkles,
  ArrowLeftRight,
} from "lucide-react";
import {
  clearApiCalls,
  getApiCalls,
  subscribeApiCalls,
  type ApiCallEntry,
  type ApiCallSource,
} from "@/lib/apiCallLog";
import { cn } from "@/lib/utils";

function useApiCalls(): ApiCallEntry[] {
  return useSyncExternalStore(
    subscribeApiCalls,
    getApiCalls,
    () => [] as ApiCallEntry[],
  );
}

export function ApiCallLog() {
  const calls = useApiCalls();
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="card-glass rounded-[10px] overflow-hidden">
      {/* Header row: toggle and clear are siblings, never nested, so both can
          be real buttons with no invalid-nesting hydration error. */}
      <div className="flex items-stretch justify-between gap-3">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-2.5 flex-1 min-w-0 px-4 py-3 text-left hover:bg-[color:var(--color-surface-2)] transition-colors"
          aria-expanded={expanded}
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-[color:var(--color-fg-muted)]" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-[color:var(--color-fg-muted)]" />
          )}
          <span className="text-xs uppercase tracking-[0.12em] text-[color:var(--color-fg)]">
            Live API calls
          </span>
          <span className="text-xs font-mono text-[color:var(--color-fg-subtle)]">
            {calls.length === 0 ? "no calls yet" : `${calls.length} recent`}
          </span>
        </button>
        {calls.length > 0 && (
          <button
            onClick={() => clearApiCalls()}
            className="inline-flex items-center gap-1 px-4 py-3 text-xs font-mono text-[color:var(--color-fg-subtle)] hover:text-[color:var(--color-danger)] transition-colors shrink-0"
            aria-label="Clear API call log"
          >
            <Trash2 className="h-3 w-3" />
            clear
          </button>
        )}
      </div>

      {expanded && (
        <div className="border-t border-[color:var(--color-border)]">
          {calls.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="divide-y divide-[color:var(--color-border)] max-h-[320px] overflow-y-auto">
              {calls.map((c) => (
                <ApiCallRow key={c.id} call={c} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="px-4 py-6 text-center">
      <p className="text-xs text-[color:var(--color-fg-subtle)]">
        Calls to{" "}
        <code className="font-mono text-[color:var(--color-fg-muted)]">
          /api/prices
        </code>{" "}
        and{" "}
        <code className="font-mono text-[color:var(--color-fg-muted)]">
          /api/briefing
        </code>{" "}
        will appear here as they happen.
      </p>
    </div>
  );
}

function ApiCallRow({ call }: { call: ApiCallEntry }) {
  const [expanded, setExpanded] = useState(false);
  const toggle = useCallback(() => setExpanded((v) => !v), []);

  return (
    <li>
      <button
        onClick={toggle}
        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[color:var(--color-surface-2)] transition-colors text-left"
      >
        <StatusDot ok={call.ok} />
        <SourceBadge source={call.source} />
        <span className="text-xs font-mono text-[color:var(--color-fg-muted)] tabular-nums w-[64px] shrink-0">
          {formatTime(call.timestamp)}
        </span>
        <span className="flex-1 min-w-0 text-xs text-[color:var(--color-fg)] truncate">
          {call.summary}
        </span>
        <span className="text-xs font-mono text-[color:var(--color-fg-subtle)] tabular-nums w-[56px] text-right shrink-0">
          {call.latencyMs}ms
        </span>
        <span
          className={cn(
            "text-xs font-mono tabular-nums w-[40px] text-right shrink-0",
            call.ok
              ? "text-[color:var(--color-success)]"
              : "text-[color:var(--color-danger)]",
          )}
        >
          {call.status || "—"}
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-3 pt-1 pl-[60px] space-y-1.5">
          <DetailRow label="endpoint" value={call.endpoint} />
          <DetailRow label="upstream" value={call.upstreamUrl} mono break />
          {call.detail && (
            <DetailRow label="detail" value={call.detail} tone="warn" />
          )}
          {call.tokens && (
            <DetailRow
              label="tokens"
              value={`in ${call.tokens.input} · out ${call.tokens.output}${
                call.tokens.cacheRead > 0 ? ` · cache ${call.tokens.cacheRead}` : ""
              }`}
              mono
            />
          )}
        </div>
      )}
    </li>
  );
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <Circle
      className={cn(
        "h-2 w-2 shrink-0 fill-current",
        ok ? "text-[color:var(--color-success)]" : "text-[color:var(--color-danger)]",
      )}
      strokeWidth={0}
    />
  );
}

function SourceBadge({ source }: { source: ApiCallSource }) {
  const config =
    source === "prices"
      ? {
          icon: <Database className="h-2.5 w-2.5" />,
          label: "soso",
          tone: "bg-[color:var(--color-accent-dim)] text-[color:var(--color-accent)]",
        }
      : source === "sodex"
        ? {
            icon: <ArrowLeftRight className="h-2.5 w-2.5" />,
            label: "sodex",
            tone: "bg-[color:var(--color-success-dim)] text-[color:var(--color-success)]",
          }
        : {
            icon: <Sparkles className="h-2.5 w-2.5" />,
            label: "claude",
            tone: "bg-[color:var(--color-warn-dim)] text-[color:var(--color-warn)]",
          };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 h-[18px] rounded-[3px] text-xs font-mono shrink-0",
        config.tone,
      )}
    >
      {config.icon}
      {config.label}
    </span>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
  break: breakAll = false,
  tone = "default",
}: {
  label: string;
  value: string;
  mono?: boolean;
  break?: boolean;
  tone?: "default" | "warn";
}) {
  return (
    <div className="flex gap-3 text-xs">
      <span className="text-[color:var(--color-fg-subtle)] font-mono w-[56px] shrink-0 uppercase tracking-wider">
        {label}
      </span>
      <span
        className={cn(
          "flex-1 min-w-0",
          mono ? "font-mono" : "",
          breakAll ? "break-all" : "",
          tone === "warn"
            ? "text-[color:var(--color-warn)]"
            : "text-[color:var(--color-fg-muted)]",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}
