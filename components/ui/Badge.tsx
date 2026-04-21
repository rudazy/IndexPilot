import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import type { DriftStatus } from "@/lib/types";

type BadgeTone = "neutral" | "success" | "warn" | "danger" | "accent";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

const tones: Record<BadgeTone, string> = {
  neutral:
    "bg-[color:var(--color-surface-2)] text-[color:var(--color-fg-muted)] border border-[color:var(--color-border-strong)]",
  success:
    "bg-[color:var(--color-success-dim)] text-[color:var(--color-success)] border border-transparent",
  warn: "bg-[color:var(--color-warn-dim)] text-[color:var(--color-warn)] border border-transparent",
  danger:
    "bg-[color:var(--color-danger-dim)] text-[color:var(--color-danger)] border border-transparent",
  accent:
    "bg-[color:var(--color-accent-dim)] text-[color:var(--color-accent)] border border-transparent",
};

export function Badge({ tone = "neutral", className, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 h-6 px-2 rounded-[4px] text-[11px] font-medium tracking-wide uppercase",
        tones[tone],
        className,
      )}
      {...rest}
    />
  );
}

export function driftStatusTone(status: DriftStatus): BadgeTone {
  if (status === "on-target") return "success";
  if (status === "mild") return "warn";
  return "danger";
}

export function driftStatusLabel(status: DriftStatus): string {
  if (status === "on-target") return "On target";
  if (status === "mild") return "Mild drift";
  return "Rebalance";
}
