"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, RotateCcw } from "lucide-react";
import { Header } from "@/components/Header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TokenPicker } from "@/components/setup/TokenPicker";
import { AllocationRow } from "@/components/setup/AllocationRow";
import { TriggerSelector } from "@/components/setup/TriggerSelector";
import { findTokenBySymbol, TOKEN_CATALOG, type TokenCatalogEntry } from "@/lib/tokens";
import type { IndexAllocation, IndexConfig, RebalanceTrigger } from "@/lib/types";
import { loadConfig, saveConfig, clearHoldings } from "@/lib/storage";
import { cn } from "@/lib/utils";

const DEFAULT_TRIGGER: RebalanceTrigger = { kind: "drift", thresholdPct: 10 };

const DEFAULT_ALLOCATIONS: IndexAllocation[] = [
  { symbol: "BTC", targetWeight: 50 },
  { symbol: "ETH", targetWeight: 30 },
  { symbol: "SOL", targetWeight: 20 },
];

export default function SetupPage() {
  const router = useRouter();
  const [allocations, setAllocations] = useState<IndexAllocation[]>(DEFAULT_ALLOCATIONS);
  const [trigger, setTrigger] = useState<RebalanceTrigger>(DEFAULT_TRIGGER);
  const [name, setName] = useState("My index");

  useEffect(() => {
    const existing = loadConfig();
    if (!existing) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR-safe hydration from localStorage
    setAllocations(existing.allocations);
    setTrigger(existing.trigger);
    setName(existing.name);
  }, []);

  const totalWeight = useMemo(
    () => allocations.reduce((sum, a) => sum + (Number.isFinite(a.targetWeight) ? a.targetWeight : 0), 0),
    [allocations],
  );

  const usedSymbols = useMemo(
    () => new Set(allocations.map((a) => a.symbol)),
    [allocations],
  );

  const totalValid = Math.abs(totalWeight - 100) < 0.01;
  const hasTokens = allocations.length > 0;
  const noZeros = allocations.every((a) => a.targetWeight > 0);
  const canSave = totalValid && hasTokens && noZeros;

  const addToken = useCallback((token: TokenCatalogEntry) => {
    setAllocations((prev) => {
      if (prev.some((a) => a.symbol === token.symbol)) return prev;
      const defaultWeight = prev.length === 0 ? 100 : Math.max(1, Math.round((100 - prev.reduce((s, a) => s + a.targetWeight, 0))));
      return [...prev, { symbol: token.symbol, targetWeight: Math.max(0, defaultWeight) }];
    });
  }, []);

  const removeToken = useCallback((symbol: string) => {
    setAllocations((prev) => prev.filter((a) => a.symbol !== symbol));
  }, []);

  const updateWeight = useCallback((symbol: string, weight: number) => {
    setAllocations((prev) =>
      prev.map((a) => (a.symbol === symbol ? { ...a, targetWeight: weight } : a)),
    );
  }, []);

  const distributeEvenly = useCallback(() => {
    setAllocations((prev) => {
      if (prev.length === 0) return prev;
      const even = Math.floor((100 / prev.length) * 100) / 100;
      const remainder = Math.round((100 - even * prev.length) * 100) / 100;
      return prev.map((a, i) => ({
        ...a,
        targetWeight: i === 0 ? even + remainder : even,
      }));
    });
  }, []);

  const saveAndLaunch = () => {
    if (!canSave) return;
    const now = Date.now();
    const config: IndexConfig = {
      schemaVersion: 1,
      name: name.trim() || "My index",
      createdAt: now,
      updatedAt: now,
      baseCurrency: "USD",
      allocations,
      trigger,
    };
    saveConfig(config);
    clearHoldings();
    router.push("/dashboard");
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1 mx-auto w-full max-w-[960px] px-6 py-10 space-y-8">
        <PageIntro />

        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Index composition</CardTitle>
              <div className="flex items-center gap-3">
                <WeightTotal total={totalWeight} valid={totalValid} />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={distributeEvenly}
                  disabled={allocations.length === 0}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Even split
                </Button>
              </div>
            </CardHeader>
            <div>
              {allocations.length === 0 ? (
                <EmptyAllocations />
              ) : (
                allocations.map((a) => {
                  const token = findTokenBySymbol(a.symbol);
                  if (!token) return null;
                  return (
                    <AllocationRow
                      key={a.symbol}
                      token={token}
                      weight={a.targetWeight}
                      onWeightChange={(w) => updateWeight(a.symbol, w)}
                      onRemove={() => removeToken(a.symbol)}
                    />
                  );
                })
              )}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Add tokens</CardTitle>
              <span className="text-xs text-[color:var(--color-fg-subtle)]">
                {TOKEN_CATALOG.length - usedSymbols.size} available
              </span>
            </CardHeader>
            <CardBody>
              <TokenPicker usedSymbols={usedSymbols} onAdd={addToken} />
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Rebalance trigger</CardTitle>
            <span className="text-xs text-[color:var(--color-fg-subtle)]">
              When should the agent act?
            </span>
          </CardHeader>
          <CardBody>
            <TriggerSelector value={trigger} onChange={setTrigger} />
          </CardBody>
        </Card>

        <div className="flex items-center justify-between gap-4 pt-4 border-t border-[color:var(--color-border)]">
          <Link
            href="/"
            className="text-sm text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors"
          >
            Cancel
          </Link>
          <div className="flex items-center gap-3">
            {!canSave && (
              <ValidationHint
                hasTokens={hasTokens}
                totalValid={totalValid}
                noZeros={noZeros}
              />
            )}
            <Button
              onClick={saveAndLaunch}
              disabled={!canSave}
              size="lg"
            >
              Launch dashboard
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

function PageIntro() {
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-[0.15em] text-[color:var(--color-fg-subtle)]">
        Step 1
      </p>
      <h1 className="text-4xl sm:text-5xl font-normal text-[color:var(--color-fg)]">
        Design your index.
      </h1>
      <p className="text-base text-[color:var(--color-fg-muted)] max-w-[50ch]">
        Pick the tokens, set the target weights, and choose how often the agent
        should check for drift.
      </p>
    </div>
  );
}

function WeightTotal({ total, valid }: { total: number; valid: boolean }) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 h-8 px-3 rounded-[6px] text-xs font-medium",
        valid
          ? "bg-[color:var(--color-success-dim)] text-[color:var(--color-success)]"
          : "bg-[color:var(--color-warn-dim)] text-[color:var(--color-warn)]",
      )}
    >
      <span className="text-numeric">{total.toFixed(1)}%</span>
      <span className="opacity-70">/ 100%</span>
    </div>
  );
}

function EmptyAllocations() {
  return (
    <div className="p-10 text-center text-sm text-[color:var(--color-fg-subtle)]">
      No tokens in this index yet. Add one to begin.
    </div>
  );
}

function ValidationHint({
  hasTokens,
  totalValid,
  noZeros,
}: {
  hasTokens: boolean;
  totalValid: boolean;
  noZeros: boolean;
}) {
  let message = "";
  if (!hasTokens) message = "Add at least one token.";
  else if (!totalValid) message = "Weights must sum to 100%.";
  else if (!noZeros) message = "Remove zero-weight tokens.";

  return (
    <span className="text-xs text-[color:var(--color-warn)]">{message}</span>
  );
}
