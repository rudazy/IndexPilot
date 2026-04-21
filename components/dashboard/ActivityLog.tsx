import type { ActivityEvent } from "@/lib/types";
import { cn, formatRelativeTime } from "@/lib/utils";

interface ActivityLogProps {
  events: ActivityEvent[];
}

const KIND_LABEL: Record<ActivityEvent["kind"], string> = {
  "drift-detected": "Drift detected",
  "rebalance-proposed": "Rebalance proposed",
  "rebalance-executed": "Rebalance executed",
  "config-updated": "Config updated",
};

const KIND_TONE: Record<ActivityEvent["kind"], string> = {
  "drift-detected": "var(--color-warn)",
  "rebalance-proposed": "var(--color-accent)",
  "rebalance-executed": "var(--color-success)",
  "config-updated": "var(--color-fg-muted)",
};

export function ActivityLog({ events }: ActivityLogProps) {
  if (events.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-sm text-[color:var(--color-fg-subtle)]">
        No activity yet. Rebalance events will appear here.
      </div>
    );
  }

  return (
    <ol className="divide-y divide-[color:var(--color-border)]">
      {events.map((e) => (
        <li key={e.id} className="py-3 px-6">
          <div className="flex items-center gap-3">
            <span
              className="h-1.5 w-1.5 rounded-full shrink-0"
              style={{ backgroundColor: KIND_TONE[e.kind] }}
            />
            <span className={cn("text-xs uppercase tracking-wide font-medium")}
              style={{ color: KIND_TONE[e.kind] }}
            >
              {KIND_LABEL[e.kind]}
            </span>
            <span className="text-[11px] text-[color:var(--color-fg-subtle)] ml-auto text-numeric">
              {formatRelativeTime(e.timestamp)}
            </span>
          </div>
          <p className="text-sm mt-1 text-[color:var(--color-fg)]">{e.summary}</p>
          {e.explanation && (
            <p className="text-xs mt-1 text-[color:var(--color-fg-muted)] leading-relaxed">
              {e.explanation}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
