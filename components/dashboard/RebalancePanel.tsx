import { ArrowDownRight, ArrowUpRight, ExternalLink, Sparkles } from "lucide-react";
import type { RebalancePlan } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { formatNumber, formatUsd } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { SODEX_APP_URL } from "@/lib/sodex";

interface RebalancePanelProps {
  plan: RebalancePlan;
  onRecompute?: () => void;
}

export function RebalancePanel({ plan, onRecompute }: RebalancePanelProps) {
  const hasOrders = plan.orders.length > 0;

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 p-4 rounded-[10px] bg-[color:var(--color-accent-dim)] border border-[color:var(--color-accent)]/30">
        <Sparkles className="h-4 w-4 mt-0.5 text-[color:var(--color-accent)] shrink-0" />
        <p className="text-sm leading-relaxed text-[color:var(--color-fg)]">
          {plan.explanation}
        </p>
      </div>

      {hasOrders ? (
        <ol className="space-y-2">
          {plan.orders.map((o, i) => (
            <li
              key={`${o.side}-${o.symbol}-${i}`}
              className={cn(
                "grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3",
                "bg-[color:var(--color-surface-2)] border border-[color:var(--color-border)] rounded-[8px]",
              )}
            >
              <div
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center",
                  o.side === "sell"
                    ? "bg-[color:var(--color-danger-dim)] text-[color:var(--color-danger)]"
                    : "bg-[color:var(--color-success-dim)] text-[color:var(--color-success)]",
                )}
              >
                {o.side === "sell" ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : (
                  <ArrowDownRight className="h-4 w-4" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium">
                  {o.side === "sell" ? "Sell" : "Buy"}{" "}
                  <span className="text-numeric">
                    {formatNumber(o.amountToken, 4)}
                  </span>{" "}
                  {o.symbol}
                </div>
                <div className="text-xs text-[color:var(--color-fg-subtle)] text-numeric">
                  ~ {formatUsd(o.amountUsd)} at {formatUsd(o.priceUsd)}
                </div>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="px-4 py-6 text-center text-sm text-[color:var(--color-fg-subtle)] border border-dashed border-[color:var(--color-border)] rounded-[8px]">
          No orders required. Index is within target weights.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-2">
        {onRecompute && (
          <Button variant="secondary" size="md" onClick={onRecompute}>
            Recompute plan
          </Button>
        )}
        <a
          href={SODEX_APP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex"
        >
          <Button variant="primary" size="md" disabled={!hasOrders}>
            Execute on SoDEX
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </a>
      </div>
    </div>
  );
}
