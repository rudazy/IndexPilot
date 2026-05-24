"use client";

import { RefreshCw, Sparkles, ShieldAlert, TrendingUp, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import type { Briefing, BriefingMeta, BriefingConfidence } from "@/hooks/useBriefing";

interface AIBriefingProps {
  briefing: Briefing | null;
  meta: BriefingMeta | null;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  fallbackExplanation: string;
  onRefresh: () => void;
}

export function AIBriefing({
  briefing,
  meta,
  isLoading,
  isFetching,
  isError,
  error,
  fallbackExplanation,
  onRefresh,
}: AIBriefingProps) {
  if (isLoading) return <BriefingSkeleton />;

  if (isError || !briefing) {
    return (
      <div className="p-4 rounded-[10px] bg-[color:var(--color-surface-2)] border border-[color:var(--color-border)] space-y-3">
        <div className="flex items-center gap-2 text-xs text-[color:var(--color-warn)]">
          <AlertTriangle className="h-3.5 w-3.5" />
          AI briefing unavailable
          {error?.message && (
            <span className="text-[color:var(--color-fg-subtle)] normal-case">
              · {error.message.slice(0, 120)}
            </span>
          )}
        </div>
        <p className="text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
          {fallbackExplanation}
        </p>
        <button
          onClick={onRefresh}
          className="inline-flex items-center gap-1.5 text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors"
        >
          <RefreshCw className={cn("h-3 w-3", isFetching && "animate-spin")} />
          Retry briefing
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="p-4 rounded-[10px] bg-[color:var(--color-accent-dim)] border border-[color:var(--color-accent)]/30 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 min-w-0">
            <Sparkles className="h-4 w-4 mt-0.5 text-[color:var(--color-accent)] shrink-0" />
            <p className="text-sm leading-relaxed text-[color:var(--color-fg)] font-medium">
              {briefing.headline}
            </p>
          </div>
          <ConfidenceBadge confidence={briefing.confidence} />
        </div>

        <Section
          label="Drift summary"
          icon={<TrendingUp className="h-3 w-3" />}
          body={briefing.drift_summary}
        />
        <Section
          label="Trade rationale"
          icon={<Sparkles className="h-3 w-3" />}
          body={briefing.trade_rationale}
        />
        <Section
          label="Risk note"
          icon={<ShieldAlert className="h-3 w-3" />}
          body={briefing.risk_note}
          tone="warn"
        />
      </div>

      <div className="flex items-center justify-between gap-3 text-xs text-[color:var(--color-fg-subtle)] font-mono">
        <span>
          {meta && (
            <>
              <span className="text-[color:var(--color-fg-muted)]">{meta.model}</span>
              {" · "}
              {meta.latencyMs}ms
              {" · "}
              {meta.usage.inputTokens}/{meta.usage.outputTokens} in/out
              {meta.usage.cacheReadTokens > 0 && (
                <> · cache hit {meta.usage.cacheReadTokens}</>
              )}
            </>
          )}
        </span>
        <button
          onClick={onRefresh}
          disabled={isFetching}
          className="inline-flex items-center gap-1 text-[color:var(--color-fg-subtle)] hover:text-[color:var(--color-fg)] transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("h-3 w-3", isFetching && "animate-spin")} />
          {isFetching ? "Refreshing" : "Refresh briefing"}
        </button>
      </div>
    </div>
  );
}

function Section({
  label,
  body,
  icon,
  tone = "default",
}: {
  label: string;
  body: string;
  icon: React.ReactNode;
  tone?: "default" | "warn";
}) {
  return (
    <div className="space-y-1">
      <div
        className={cn(
          "flex items-center gap-1.5 text-xs uppercase tracking-[0.12em]",
          tone === "warn"
            ? "text-[color:var(--color-warn)]"
            : "text-[color:var(--color-fg-subtle)]",
        )}
      >
        {icon}
        {label}
      </div>
      <p className="text-sm leading-relaxed text-[color:var(--color-fg-muted)] pl-[18px]">
        {body}
      </p>
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: BriefingConfidence }) {
  const tone =
    confidence === "high" ? "success" : confidence === "medium" ? "warn" : "neutral";
  return <Badge tone={tone}>{confidence} confidence</Badge>;
}

function BriefingSkeleton() {
  return (
    <div className="p-4 rounded-[10px] bg-[color:var(--color-accent-dim)] border border-[color:var(--color-accent)]/30 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-[color:var(--color-accent)] animate-pulse" />
        <span className="text-xs text-[color:var(--color-fg-subtle)] uppercase tracking-wide">
          Generating briefing
        </span>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-[color:var(--color-surface-2)] rounded animate-pulse w-3/4" />
        <div className="h-3 bg-[color:var(--color-surface-2)] rounded animate-pulse w-full" />
        <div className="h-3 bg-[color:var(--color-surface-2)] rounded animate-pulse w-5/6" />
      </div>
      <div className="pt-2 space-y-2">
        <div className="h-3 bg-[color:var(--color-surface-2)] rounded animate-pulse w-2/3" />
        <div className="h-3 bg-[color:var(--color-surface-2)] rounded animate-pulse w-4/5" />
      </div>
    </div>
  );
}
