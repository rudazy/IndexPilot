import { cn } from "@/lib/utils";
import type { DriftStatus } from "@/lib/types";

interface DriftBarProps {
  driftPct: number;
  status: DriftStatus;
  maxDriftPct?: number;
}

const DEFAULT_MAX = 20;

export function DriftBar({ driftPct, status, maxDriftPct = DEFAULT_MAX }: DriftBarProps) {
  const clamped = Math.max(-maxDriftPct, Math.min(maxDriftPct, driftPct));
  const fillPct = (Math.abs(clamped) / maxDriftPct) * 50;
  const color =
    status === "rebalance"
      ? "var(--color-danger)"
      : status === "mild"
      ? "var(--color-warn)"
      : "var(--color-success)";

  const overMax = Math.abs(driftPct) >= maxDriftPct;

  return (
    <div
      className="relative h-1.5 w-full rounded-full bg-[color:var(--color-surface-3)]"
      aria-label={`Drift ${driftPct.toFixed(1)} percent`}
    >
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-3 w-px bg-[color:var(--color-fg-muted)] opacity-40" />
      <div
        className={cn("absolute top-0 h-full rounded-full", overMax && "opacity-90")}
        style={{
          backgroundColor: color,
          width: `${fillPct}%`,
          ...(driftPct >= 0
            ? { left: "50%" }
            : { right: "50%" }),
        }}
      />
    </div>
  );
}
