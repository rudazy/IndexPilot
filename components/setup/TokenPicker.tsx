"use client";

import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { TOKEN_CATALOG, type TokenCatalogEntry } from "@/lib/tokens";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

interface TokenPickerProps {
  usedSymbols: Set<string>;
  onAdd: (token: TokenCatalogEntry) => void;
}

export function TokenPicker({ usedSymbols, onAdd }: TokenPickerProps) {
  const [query, setQuery] = useState("");

  const available = useMemo(
    () =>
      TOKEN_CATALOG.filter((t) => !usedSymbols.has(t.symbol)).filter((t) => {
        if (!query) return true;
        const q = query.toLowerCase();
        return (
          t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q)
        );
      }),
    [usedSymbols, query],
  );

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--color-fg-subtle)]" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tokens — BTC, ETH, SOL"
          className="pl-10"
        />
      </div>

      {available.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {available.map((token) => (
            <button
              key={token.symbol}
              onClick={() => {
                onAdd(token);
                setQuery("");
              }}
              className={cn(
                "flex items-center justify-between gap-2 h-12 px-3",
                "bg-[color:var(--color-surface-2)] border border-[color:var(--color-border)] rounded-[8px]",
                "hover:border-[color:var(--color-accent)] hover:bg-[color:var(--color-surface-3)]",
                "text-left transition-all duration-150 group",
              )}
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-[color:var(--color-fg)] truncate">
                  {token.symbol}
                </div>
                <div className="text-xs text-[color:var(--color-fg-subtle)] truncate">
                  {token.name}
                </div>
              </div>
              <Plus className="h-4 w-4 text-[color:var(--color-fg-subtle)] group-hover:text-[color:var(--color-accent)]" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-xs text-[color:var(--color-fg-subtle)] px-3 py-6 text-center border border-dashed border-[color:var(--color-border)] rounded-[8px]">
      All supported tokens added, or none match your search.
    </div>
  );
}
