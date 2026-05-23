"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import type { RebalancePlan } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { formatNumber, formatUsd } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { SODEX_APP_URL } from "@/lib/sodexTypes";
import { useSodex } from "@/hooks/useSodex";
import { AIBriefing } from "./AIBriefing";
import type { Briefing, BriefingMeta } from "@/hooks/useBriefing";

interface RebalancePanelProps {
  plan: RebalancePlan;
  briefing: Briefing | null;
  briefingMeta: BriefingMeta | null;
  briefingLoading: boolean;
  briefingFetching: boolean;
  briefingError: boolean;
  briefingErrorObj: Error | null;
  onRefreshBriefing: () => void;
  onRecompute?: () => void;
}

export function RebalancePanel({
  plan,
  briefing,
  briefingMeta,
  briefingLoading,
  briefingFetching,
  briefingError,
  briefingErrorObj,
  onRefreshBriefing,
  onRecompute,
}: RebalancePanelProps) {
  const hasOrders = plan.orders.length > 0;
  const {
    quote,
    execute,
    reset,
    quoteData,
    executeData,
    isQuoting,
    isExecuting,
    quoteError,
    executeError,
  } = useSodex();

  const tradableQuotes = quoteData?.quotes.filter((q) => q.tradable) ?? [];
  const account = quoteData?.account ?? null;
  const canExecute =
    tradableQuotes.length > 0 && account?.ready === true && !executeData;

  return (
    <div className="space-y-5">
      <AIBriefing
        briefing={briefing}
        meta={briefingMeta}
        isLoading={briefingLoading}
        isFetching={briefingFetching}
        isError={briefingError}
        error={briefingErrorObj}
        fallbackExplanation={plan.explanation}
        onRefresh={onRefreshBriefing}
      />

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

      {/* SoDEX execution flow */}
      {quoteError && (
        <ExecNotice tone="danger" text={quoteError.message} />
      )}

      {quoteData && !executeData && (
        <SodexQuoteSummary
          quotes={quoteData.quotes}
          account={account}
          network={quoteData.network}
          totalNotionalUsd={quoteData.totalNotionalUsd}
        />
      )}

      {executeError && <ExecNotice tone="danger" text={executeError.message} />}

      {executeData && (
        <SodexExecutionResult
          message={executeData.message}
          ok={executeData.code === 0}
          results={executeData.results}
          network={executeData.network}
        />
      )}

      <div className="flex flex-wrap items-center gap-2 pt-2">
        {onRecompute && (
          <Button variant="secondary" size="md" onClick={onRecompute}>
            Recompute plan
          </Button>
        )}

        {!quoteData && (
          <Button
            variant="primary"
            size="md"
            disabled={!hasOrders || isQuoting}
            onClick={() => quote(plan.orders)}
          >
            {isQuoting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Quoting…
              </>
            ) : (
              <>Preview on SoDEX</>
            )}
          </Button>
        )}

        {quoteData && !executeData && (
          <>
            <Button
              variant="primary"
              size="md"
              disabled={!canExecute || isExecuting}
              onClick={() => execute(tradableQuotes)}
            >
              {isExecuting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Executing…
                </>
              ) : (
                <>Execute {tradableQuotes.length} order
                  {tradableQuotes.length === 1 ? "" : "s"}</>
              )}
            </Button>
            <Button variant="secondary" size="md" onClick={reset} disabled={isExecuting}>
              Cancel
            </Button>
          </>
        )}

        {executeData && (
          <Button variant="secondary" size="md" onClick={reset}>
            Done
          </Button>
        )}

        <a
          href={SODEX_APP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors ml-auto"
        >
          View on SoDEX <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

function SodexQuoteSummary({
  quotes,
  account,
  network,
  totalNotionalUsd,
}: {
  quotes: import("@/lib/sodexTypes").SodexQuote[];
  account: import("@/lib/sodexTypes").SodexAccountInfo | null;
  network: string;
  totalNotionalUsd: number;
}) {
  const skipped = quotes.filter((q) => !q.tradable);
  return (
    <div className="space-y-3 px-4 py-3 bg-[color:var(--color-surface-2)] border border-[color:var(--color-border)] rounded-[8px]">
      <div className="flex items-center justify-between text-xs">
        <span className="font-mono uppercase tracking-wide text-[color:var(--color-fg-subtle)]">
          SoDEX quote · {network}
        </span>
        <span className="text-numeric text-[color:var(--color-fg-muted)]">
          ~ {formatUsd(totalNotionalUsd)} notional
        </span>
      </div>

      <ul className="space-y-1.5">
        {quotes
          .filter((q) => q.tradable)
          .map((q) => (
            <li key={q.clOrdId} className="flex items-center justify-between text-sm">
              <span>
                <span className="font-medium capitalize">{q.side}</span> {q.market}
              </span>
              <span className="text-numeric text-xs text-[color:var(--color-fg-muted)]">
                {q.side === "sell"
                  ? `${q.quantity} ${q.symbol}`
                  : `${q.funds} USDC`}{" "}
                · fee ~{formatUsd(q.estFeeUsd)}
              </span>
            </li>
          ))}
      </ul>

      {skipped.length > 0 && (
        <ul className="space-y-1 pt-1 border-t border-[color:var(--color-border)]">
          {skipped.map((q) => (
            <li
              key={q.clOrdId}
              className="flex items-center justify-between text-xs text-[color:var(--color-fg-subtle)]"
            >
              <span>{q.symbol} skipped</span>
              <span className="text-right">{q.skipReason}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="text-xs pt-1 border-t border-[color:var(--color-border)]">
        {account === null ? (
          <span className="text-[color:var(--color-warn)]">
            No signer configured — set SODEX_SIGNER_PRIVATE_KEY and SODEX_API_KEY_NAME to execute.
          </span>
        ) : account.ready ? (
          <span className="text-[color:var(--color-fg-muted)] text-numeric">
            Account #{account.accountId} ready
          </span>
        ) : (
          <span className="text-[color:var(--color-warn)] text-numeric">
            No SoDEX account for {truncate(account.address)} — deposit/create one before executing.
          </span>
        )}
      </div>
    </div>
  );
}

function SodexExecutionResult({
  message,
  ok,
  results,
  network,
}: {
  message: string;
  ok: boolean;
  results: import("@/lib/sodexTypes").SodexOrderResult[];
  network: string;
}) {
  return (
    <div
      className={cn(
        "space-y-2 px-4 py-3 rounded-[8px] border",
        ok
          ? "bg-[color:var(--color-success-dim)] border-[color:var(--color-success)]/30"
          : "bg-[color:var(--color-danger-dim)] border-[color:var(--color-danger)]/30",
      )}
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        {ok ? (
          <CheckCircle2 className="h-4 w-4 text-[color:var(--color-success)]" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-[color:var(--color-danger)]" />
        )}
        {ok ? "Submitted to SoDEX" : "Execution rejected"} · {network} — {message}
      </div>
      <ul className="space-y-1">
        {results.map((r) => (
          <li
            key={r.clOrdId}
            className="flex items-center justify-between text-xs text-numeric"
          >
            <span className="capitalize">
              {r.side} {r.symbol}
            </span>
            <span className="text-[color:var(--color-fg-muted)]">
              {r.status}
              {r.orderId ? ` · #${r.orderId}` : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ExecNotice({ tone, text }: { tone: "danger"; text: string }) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 px-4 py-3 rounded-[8px] border text-sm",
        tone === "danger" &&
          "bg-[color:var(--color-danger-dim)] border-[color:var(--color-danger)]/30 text-[color:var(--color-danger)]",
      )}
    >
      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
      <span>{text}</span>
    </div>
  );
}

function truncate(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
