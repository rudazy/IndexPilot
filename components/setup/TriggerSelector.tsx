"use client";

import { Clock, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RebalanceTrigger, TimeInterval } from "@/lib/types";

interface TriggerSelectorProps {
  value: RebalanceTrigger;
  onChange: (trigger: RebalanceTrigger) => void;
}

const DRIFT_OPTIONS = [5, 10, 15] as const;
const TIME_OPTIONS: { value: TimeInterval; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
];

export function TriggerSelector({ value, onChange }: TriggerSelectorProps) {
  const kind = value.kind;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <KindCard
          active={kind === "time"}
          icon={<Clock className="h-4 w-4" />}
          title="Time-based"
          subtitle="Check on a schedule"
          onClick={() =>
            onChange({ kind: "time", interval: "weekly" })
          }
        />
        <KindCard
          active={kind === "drift"}
          icon={<Activity className="h-4 w-4" />}
          title="Drift-based"
          subtitle="Trigger on weight deviation"
          onClick={() => onChange({ kind: "drift", thresholdPct: 10 })}
        />
      </div>

      {kind === "time" ? (
        <div className="flex gap-2">
          {TIME_OPTIONS.map((opt) => (
            <Pill
              key={opt.value}
              active={value.kind === "time" && value.interval === opt.value}
              onClick={() => onChange({ kind: "time", interval: opt.value })}
            >
              {opt.label}
            </Pill>
          ))}
        </div>
      ) : (
        <div className="flex gap-2">
          {DRIFT_OPTIONS.map((pct) => (
            <Pill
              key={pct}
              active={value.kind === "drift" && value.thresholdPct === pct}
              onClick={() => onChange({ kind: "drift", thresholdPct: pct })}
            >
              {pct}%
            </Pill>
          ))}
        </div>
      )}
    </div>
  );
}

function KindCard({
  active,
  icon,
  title,
  subtitle,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-1.5 p-4 rounded-[10px] border transition-all duration-150 text-left",
        active
          ? "bg-[color:var(--color-accent-dim)] border-[color:var(--color-accent)] text-[color:var(--color-fg)]"
          : "bg-[color:var(--color-surface-2)] border-[color:var(--color-border)] text-[color:var(--color-fg-muted)] hover:bg-[color:var(--color-surface-3)] hover:text-[color:var(--color-fg)]",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 text-sm font-medium",
          active ? "text-[color:var(--color-accent)]" : "",
        )}
      >
        {icon}
        {title}
      </div>
      <div className="text-xs text-[color:var(--color-fg-subtle)]">{subtitle}</div>
    </button>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-9 px-4 rounded-[8px] text-sm font-medium border transition-all duration-150",
        active
          ? "bg-[color:var(--color-fg)] text-[color:var(--color-bg)] border-[color:var(--color-fg)]"
          : "bg-transparent border-[color:var(--color-border-strong)] text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] hover:border-[color:var(--color-fg-subtle)]",
      )}
    >
      {children}
    </button>
  );
}
