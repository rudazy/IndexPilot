"use client";

import { Minus } from "lucide-react";
import type { TokenCatalogEntry } from "@/lib/tokens";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface AllocationRowProps {
  token: TokenCatalogEntry;
  weight: number;
  onWeightChange: (value: number) => void;
  onRemove: () => void;
}

export function AllocationRow({
  token,
  weight,
  onWeightChange,
  onRemove,
}: AllocationRowProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 py-3 px-4",
        "border-b border-[color:var(--color-border)] last:border-b-0",
      )}
    >
      <TokenGlyph symbol={token.symbol} />

      <div>
        <div className="text-sm font-medium text-[color:var(--color-fg)]">
          {token.name}
        </div>
        <div className="text-xs text-[color:var(--color-fg-subtle)]">
          {token.symbol}
        </div>
      </div>

      <div className="flex items-center gap-2 w-32">
        <Input
          type="number"
          min={0}
          max={100}
          step={0.5}
          value={Number.isFinite(weight) ? weight : 0}
          onChange={(e) => {
            const raw = e.target.valueAsNumber;
            onWeightChange(Number.isFinite(raw) ? raw : 0);
          }}
          className="text-right text-numeric"
        />
        <span className="text-xs text-[color:var(--color-fg-subtle)] w-3">%</span>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
        aria-label={`Remove ${token.symbol}`}
      >
        <Minus className="h-4 w-4" />
      </Button>
    </div>
  );
}

function TokenGlyph({ symbol }: { symbol: string }) {
  return (
    <div
      className={cn(
        "h-9 w-9 rounded-full flex items-center justify-center text-[11px] font-semibold",
        "bg-[color:var(--color-surface-2)] border border-[color:var(--color-border-strong)]",
        "text-[color:var(--color-fg)]",
      )}
      aria-hidden
    >
      {symbol.slice(0, 3)}
    </div>
  );
}
