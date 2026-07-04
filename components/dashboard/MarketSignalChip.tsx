"use client";

import { Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MarketSignal, RebalanceUrgency } from "@/lib/signalTypes";

interface MarketSignalChipProps {
  urgency: RebalanceUrgency | null;
  signals: MarketSignal[];
  usedProxy: boolean;
  isLoading: boolean;
  isError: boolean;
}

const URGENCY_LABEL: Record<RebalanceUrgency, string> = {
  low: "Signal: low",
  medium: "Signal: medium",
  high: "Signal: high",
  urgent: "Signal: urgent",
};

// Chip palette per urgency: lime for low, gold for medium, red for high/urgent.
const URGENCY_TONE: Record<RebalanceUrgency, { text: string; bg: string; dot: string }> = {
  low: {
    text: "text-[color:var(--color-signal-low)]",
    bg: "bg-[color:var(--color-signal-low-dim)]",
    dot: "bg-[color:var(--color-signal-low)]",
  },
  medium: {
    text: "text-[color:var(--color-warn)]",
    bg: "bg-[color:var(--color-warn-dim)]",
    dot: "bg-[color:var(--color-warn)]",
  },
  high: {
    text: "text-[color:var(--color-danger)]",
    bg: "bg-[color:var(--color-danger-dim)]",
    dot: "bg-[color:var(--color-danger)]",
  },
  urgent: {
    text: "text-[color:var(--color-danger)]",
    bg: "bg-[color:var(--color-danger-dim)]",
    dot: "bg-[color:var(--color-danger)] animate-pulse",
  },
};

/**
 * Compact "Market Signal" chip for the dashboard hero. Shows the combined
 * SoSoValue urgency level; hovering reveals the individual signals (ETF flows
 * and momentum) that produced it.
 */
export function MarketSignalChip({
  urgency,
  signals,
  usedProxy,
  isLoading,
  isError,
}: MarketSignalChipProps) {
  const base =
    "inline-flex items-center gap-1.5 text-xs px-2 h-5 rounded-[4px] font-mono uppercase tracking-wide";

  if (isLoading) {
    return (
      <span className={cn(base, "bg-[color:var(--color-surface-2)] text-[color:var(--color-fg-subtle)] border border-[color:var(--color-border-strong)]")}>
        <Radio className="h-3 w-3 animate-pulse" />
        Signal
      </span>
    );
  }

  if (isError || !urgency) {
    return (
      <span
        className={cn(base, "bg-[color:var(--color-surface-2)] text-[color:var(--color-fg-subtle)] border border-[color:var(--color-border-strong)]")}
        title="Market signal unavailable. Check the Live API calls panel."
      >
        <Radio className="h-3 w-3" />
        Signal: n/a
      </span>
    );
  }

  const tone = URGENCY_TONE[urgency];

  return (
    <span className="relative group inline-flex">
      <span className={cn(base, tone.bg, tone.text, "cursor-default")}>
        <span className={cn("h-1.5 w-1.5 rounded-full", tone.dot)} />
        {URGENCY_LABEL[urgency]}
        {usedProxy && <span className="opacity-60 normal-case">proxy</span>}
      </span>

      {signals.length > 0 && (
        <span
          role="tooltip"
          className={cn(
            "pointer-events-none absolute left-0 top-full z-40 mt-1.5 w-max max-w-[340px]",
            "rounded-[6px] border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-3)]",
            "px-3 py-2.5 text-xs text-[color:var(--color-fg)] shadow-[var(--shadow-elev-2)]",
            "opacity-0 group-hover:opacity-100 transition-opacity space-y-1.5 normal-case tracking-normal text-left",
          )}
        >
          {signals.map((s) => (
            <span key={s.id} className="block leading-relaxed">
              <span
                className={cn(
                  "inline-block h-1.5 w-1.5 rounded-full mr-1.5 align-middle",
                  s.level >= 2
                    ? "bg-[color:var(--color-danger)]"
                    : s.level === 1
                      ? "bg-[color:var(--color-warn)]"
                      : "bg-[color:var(--color-signal-low)]",
                )}
              />
              {s.detail}
            </span>
          ))}
          <span className="block text-[color:var(--color-fg-subtle)] pt-1 border-t border-[color:var(--color-border)]">
            Source: SoSoValue{usedProxy ? " · ETF flow proxied by 24h momentum" : " ETF flows + momentum"}
          </span>
        </span>
      )}
    </span>
  );
}
