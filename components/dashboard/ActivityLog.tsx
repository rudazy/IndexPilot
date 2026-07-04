"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Zap, MousePointerClick } from "lucide-react";
import {
  getActivityEntries,
  getEmptyActivityEntries,
  hydrateActivityLog,
  subscribeActivityLog,
  type FillStatus,
  type RebalanceActivityEntry,
} from "@/lib/activityLog";
import { cn, formatRelativeTime, formatUsd } from "@/lib/utils";

const FILL_LABEL: Record<FillStatus, string> = {
  accepted: "Accepted",
  filled: "Filled",
  pending: "Pending",
  rejected: "Rejected",
};

const FILL_TONE: Record<FillStatus, string> = {
  accepted: "var(--color-warn)",
  filled: "var(--color-success)",
  pending: "var(--color-fg-muted)",
  rejected: "var(--color-danger)",
};

function useActivityEntries(): RebalanceActivityEntry[] {
  const entries = useSyncExternalStore(
    subscribeActivityLog,
    getActivityEntries,
    getEmptyActivityEntries,
  );
  useEffect(() => {
    hydrateActivityLog();
  }, []);
  return entries;
}

/**
 * Renders the persistent rebalance activity log (localStorage-backed, capped
 * at 50 entries). Subscribes directly to the store so entries written by the
 * manual execution flow and the auto-rebalance loop appear immediately.
 */
export function ActivityLog() {
  const entries = useActivityEntries();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (entries.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-sm text-[color:var(--color-fg-subtle)]">
        No activity yet. Executed rebalances will appear here.
      </div>
    );
  }

  return (
    <ol className="divide-y divide-[color:var(--color-border)] max-h-[420px] overflow-y-auto">
      {entries.map((e) => (
        <li key={e.id}>
          <button
            onClick={() => setExpandedId((cur) => (cur === e.id ? null : e.id))}
            className="w-full text-left py-3 px-6 hover:bg-[color:var(--color-surface-2)] transition-colors"
          >
            <div className="flex items-center gap-3">
              <span
                className="h-1.5 w-1.5 rounded-full shrink-0"
                style={{ backgroundColor: FILL_TONE[e.fillStatus] }}
              />
              <span
                className="text-xs uppercase tracking-wide font-medium"
                style={{ color: FILL_TONE[e.fillStatus] }}
              >
                {FILL_LABEL[e.fillStatus]}
              </span>
              <TriggerBadge trigger={e.trigger} />
              <NetworkBadge network={e.network} />
              <span className="text-xs text-[color:var(--color-fg-subtle)] ml-auto text-numeric">
                {formatRelativeTime(e.timestamp)}
              </span>
            </div>
            <p className="text-sm mt-1 text-[color:var(--color-fg)]">
              {e.orders.length} order{e.orders.length === 1 ? "" : "s"} executed ·{" "}
              <span className="text-numeric">{formatUsd(e.totalUsd)}</span> notional
            </p>
            {e.briefingHeadline && (
              <p className="text-xs mt-1 text-[color:var(--color-fg-muted)] leading-relaxed">
                {e.briefingHeadline}
              </p>
            )}
            {expandedId === e.id && e.orders.length > 0 && (
              <ul className="mt-2 space-y-1">
                {e.orders.map((o, i) => (
                  <li
                    key={`${e.id}-${i}`}
                    className="flex items-center justify-between text-xs text-numeric text-[color:var(--color-fg-muted)]"
                  >
                    <span className="capitalize">
                      {o.side} {o.symbol}
                    </span>
                    <span>
                      {formatUsd(o.amountUsd)}
                      {o.orderId ? ` · #${o.orderId}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </button>
        </li>
      ))}
    </ol>
  );
}

function TriggerBadge({ trigger }: { trigger: RebalanceActivityEntry["trigger"] }) {
  const isAuto = trigger === "auto";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 h-[18px] rounded-[3px] text-xs font-mono",
        isAuto
          ? "bg-[color:var(--color-signal-low-dim)] text-[color:var(--color-signal-low)]"
          : "bg-[color:var(--color-surface-2)] text-[color:var(--color-fg-muted)]",
      )}
    >
      {isAuto ? <Zap className="h-2.5 w-2.5" /> : <MousePointerClick className="h-2.5 w-2.5" />}
      {isAuto ? "auto" : "manual"}
    </span>
  );
}

function NetworkBadge({ network }: { network: RebalanceActivityEntry["network"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 h-[18px] rounded-[3px] text-xs font-mono",
        network === "mainnet"
          ? "bg-[color:var(--color-success-dim)] text-[color:var(--color-success)]"
          : "bg-[color:var(--color-warn-dim)] text-[color:var(--color-warn)]",
      )}
    >
      {network}
    </span>
  );
}
