import type { Holding } from "@/lib/types";
import { Badge, driftStatusLabel, driftStatusTone } from "@/components/ui/Badge";
import { DriftBar } from "./DriftBar";
import { formatPct, formatUsd, formatNumber } from "@/lib/utils";

interface TokenTableProps {
  holdings: Holding[];
  cashUsd?: number;
  totalUsd?: number;
}

export function TokenTable({ holdings, cashUsd = 0, totalUsd = 0 }: TokenTableProps) {
  const cashWeight = totalUsd > 0 ? (cashUsd / totalUsd) * 100 : 0;
  return (
    <div className="overflow-hidden">
      <div className="grid grid-cols-[1.1fr_1fr_1fr_1.4fr_0.9fr] gap-4 px-6 py-3 border-b border-[color:var(--color-border)] text-xs uppercase tracking-[0.1em] text-[color:var(--color-fg-subtle)]">
        <span>Token</span>
        <span className="text-right">Current</span>
        <span className="text-right">Target</span>
        <span>Drift</span>
        <span className="text-right">Status</span>
      </div>

      {holdings.map((h) => (
        <Row key={h.symbol} h={h} />
      ))}

      {cashUsd > 0 && <CashRow cashUsd={cashUsd} weight={cashWeight} />}
    </div>
  );
}

function CashRow({ cashUsd, weight }: { cashUsd: number; weight: number }) {
  return (
    <div className="grid grid-cols-[1.1fr_1fr_1fr_1.4fr_0.9fr] gap-4 items-center px-6 py-4 border-b border-[color:var(--color-border)] last:border-b-0">
      <div className="flex items-center gap-3 min-w-0">
        <span className="h-8 w-8 rounded-full bg-[color:var(--color-surface-2)] border border-[color:var(--color-border-strong)] flex items-center justify-center text-xs font-semibold">
          USD
        </span>
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">USDC</div>
          <div className="text-xs text-[color:var(--color-fg-subtle)] text-numeric">
            {formatNumber(cashUsd, 2)} · {formatUsd(cashUsd)}
          </div>
        </div>
      </div>

      <div className="text-right">
        <div className="text-sm text-numeric">{weight.toFixed(2)}%</div>
      </div>

      <div className="text-right">
        <div className="text-sm text-numeric text-[color:var(--color-fg-muted)]">—</div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-numeric w-14 text-right text-[color:var(--color-fg-muted)]">
          —
        </span>
        <span className="flex-1 min-w-0 text-xs text-[color:var(--color-fg-subtle)]">
          deployable into index
        </span>
      </div>

      <div className="flex justify-end">
        <span className="inline-flex items-center h-6 px-2 rounded-[4px] text-xs font-medium uppercase tracking-wide bg-[color:var(--color-surface-3)] text-[color:var(--color-fg-muted)]">
          Cash
        </span>
      </div>
    </div>
  );
}

function Row({ h }: { h: Holding }) {
  const driftAbs = Math.abs(h.driftPct);
  return (
    <div className="grid grid-cols-[1.1fr_1fr_1fr_1.4fr_0.9fr] gap-4 items-center px-6 py-4 border-b border-[color:var(--color-border)] last:border-b-0 hover:bg-[color:var(--color-surface-2)]/50 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <span className="h-8 w-8 rounded-full bg-[color:var(--color-surface-2)] border border-[color:var(--color-border-strong)] flex items-center justify-center text-xs font-semibold">
          {h.symbol.slice(0, 3)}
        </span>
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{h.symbol}</div>
          <div className="text-xs text-[color:var(--color-fg-subtle)] text-numeric">
            {formatNumber(h.balance, 4)} · {formatUsd(h.valueUsd)}
          </div>
        </div>
      </div>

      <div className="text-right">
        <div className="text-sm text-numeric">{h.currentWeight.toFixed(2)}%</div>
      </div>

      <div className="text-right">
        <div className="text-sm text-numeric text-[color:var(--color-fg-muted)]">
          {h.targetWeight.toFixed(2)}%
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-numeric w-14 text-right text-[color:var(--color-fg-muted)]">
          {driftAbs > 0 ? formatPct(h.driftPct, 1) : "—"}
        </span>
        <div className="flex-1 min-w-0">
          <DriftBar driftPct={h.driftPct} status={h.status} />
        </div>
      </div>

      <div className="flex justify-end">
        <Badge tone={driftStatusTone(h.status)}>{driftStatusLabel(h.status)}</Badge>
      </div>
    </div>
  );
}
