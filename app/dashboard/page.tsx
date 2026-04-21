"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RefreshCw, Settings2, AlertTriangle } from "lucide-react";
import { Header } from "@/components/Header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PortfolioChart, ChartLegend } from "@/components/dashboard/PortfolioChart";
import { TokenTable } from "@/components/dashboard/TokenTable";
import { RebalancePanel } from "@/components/dashboard/RebalancePanel";
import { ActivityLog } from "@/components/dashboard/ActivityLog";
import { PriceSourceTag } from "@/components/dashboard/PriceSourceTag";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useRebalance } from "@/hooks/useRebalance";
import { appendActivity, loadActivity } from "@/lib/storage";
import type { ActivityEvent } from "@/lib/types";
import { formatUsd, uid } from "@/lib/utils";

export default function DashboardPage() {
  const router = useRouter();
  const {
    config,
    portfolio,
    prices,
    priceSource,
    fetchedAt,
    isLoading,
    isError,
    error,
    refetch,
    resetHoldings,
  } = usePortfolio();
  const plan = useRebalance(portfolio);

  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR-safe hydration from localStorage
    setActivity(loadActivity());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated && !config) {
      router.replace("/setup");
    }
  }, [hydrated, config, router]);

  const needsRebalance = portfolio?.needsRebalance ?? false;

  const recordRebalance = () => {
    if (!plan) return;
    const event: ActivityEvent = {
      id: uid("rb"),
      timestamp: Date.now(),
      kind: "rebalance-proposed",
      summary:
        plan.orders.length === 0
          ? "No orders required."
          : `${plan.orders.length} order${plan.orders.length === 1 ? "" : "s"} generated.`,
      explanation: plan.explanation,
      plan,
    };
    const next = appendActivity(event);
    setActivity(next);
  };

  if (!hydrated) return <ScreenSkeleton />;
  if (!config) return null;

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1 mx-auto w-full max-w-[1400px] px-6 py-8 space-y-6">
        <HeroBand
          indexName={config.name}
          totalUsd={portfolio?.totalValueUsd ?? 0}
          needsRebalance={needsRebalance}
          priceSource={priceSource}
          fetchedAt={fetchedAt}
          onRefresh={refetch}
        />

        {isError && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-[8px] bg-[color:var(--color-danger-dim)] text-[color:var(--color-danger)] text-sm">
            <AlertTriangle className="h-4 w-4" />
            Failed to load prices: {error?.message ?? "unknown error"}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Allocation</CardTitle>
              <span className="text-xs text-[color:var(--color-fg-subtle)]">
                current vs target
              </span>
            </CardHeader>
            <CardBody>
              {isLoading || !portfolio ? (
                <ChartSkeleton />
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <PortfolioChart
                      holdings={portfolio.holdings}
                      mode="current"
                      totalUsd={portfolio.totalValueUsd}
                    />
                    <PortfolioChart
                      holdings={portfolio.holdings}
                      mode="target"
                      totalUsd={portfolio.totalValueUsd}
                    />
                  </div>
                  <ChartLegend holdings={portfolio.holdings} />
                </>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Holdings</CardTitle>
              <span className="text-xs text-[color:var(--color-fg-subtle)]">
                {portfolio?.holdings.length ?? 0} assets · drift vs target
              </span>
            </CardHeader>
            {isLoading || !portfolio ? (
              <TableSkeleton rows={config.allocations.length} />
            ) : (
              <TokenTable holdings={portfolio.holdings} />
            )}
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Rebalance plan</CardTitle>
              <span className="text-xs text-[color:var(--color-fg-subtle)]">
                AI-generated orders
              </span>
            </CardHeader>
            <CardBody>
              {plan ? (
                <RebalancePanel plan={plan} onRecompute={recordRebalance} />
              ) : (
                <p className="text-sm text-[color:var(--color-fg-subtle)]">
                  Waiting for price data.
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
              <Link
                href="/setup"
                className="inline-flex items-center gap-1.5 text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors"
              >
                <Settings2 className="h-3.5 w-3.5" />
                Edit index
              </Link>
            </CardHeader>
            <ActivityLog events={activity} />
          </Card>
        </div>

        <DevFooter
          onResetHoldings={() => {
            resetHoldings();
            setActivity([]);
          }}
          pricesCount={prices.length}
        />
      </main>
    </div>
  );
}

function HeroBand({
  indexName,
  totalUsd,
  needsRebalance,
  priceSource,
  fetchedAt,
  onRefresh,
}: {
  indexName: string;
  totalUsd: number;
  needsRebalance: boolean;
  priceSource: "sosovalue" | "coingecko" | null;
  fetchedAt: number | null;
  onRefresh: () => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[color:var(--color-border)] pb-6">
      <div>
        <p className="text-[10px] uppercase tracking-[0.15em] text-[color:var(--color-fg-subtle)]">
          {indexName}
        </p>
        <h1 className="text-4xl sm:text-5xl font-normal mt-1 text-numeric">
          {formatUsd(totalUsd, 2)}
        </h1>
        <div className="mt-2 flex items-center gap-3">
          <PriceSourceTag source={priceSource} fetchedAt={fetchedAt} />
          {needsRebalance && (
            <span className="text-[11px] px-2 h-5 inline-flex items-center rounded-[4px] bg-[color:var(--color-danger-dim)] text-[color:var(--color-danger)] uppercase tracking-wide">
              Rebalance recommended
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onRefresh}>
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>
    </div>
  );
}

function DevFooter({
  onResetHoldings,
  pricesCount,
}: {
  onResetHoldings: () => void;
  pricesCount: number;
}) {
  return (
    <div className="flex items-center justify-between gap-4 pt-6 border-t border-[color:var(--color-border)] text-[11px] text-[color:var(--color-fg-subtle)]">
      <span>
        Holdings simulated locally · {pricesCount} price source{pricesCount === 1 ? "" : "s"} active
      </span>
      <button
        onClick={onResetHoldings}
        className="text-[color:var(--color-fg-subtle)] hover:text-[color:var(--color-danger)] transition-colors"
      >
        Reset holdings
      </button>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 h-[240px]">
      <div className="rounded-full bg-[color:var(--color-surface-2)] animate-pulse" />
      <div className="rounded-full bg-[color:var(--color-surface-2)] animate-pulse" />
    </div>
  );
}

function TableSkeleton({ rows }: { rows: number }) {
  return (
    <div>
      {Array.from({ length: Math.max(rows, 3) }).map((_, i) => (
        <div
          key={i}
          className="h-[60px] border-b border-[color:var(--color-border)] last:border-b-0 px-6 flex items-center"
        >
          <div className="w-full h-6 bg-[color:var(--color-surface-2)] rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

function ScreenSkeleton() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <div className="flex-1 mx-auto w-full max-w-[1400px] px-6 py-8 space-y-6">
        <div className="h-20 bg-[color:var(--color-surface-2)] rounded animate-pulse" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-80 bg-[color:var(--color-surface-2)] rounded animate-pulse" />
          <div className="h-80 bg-[color:var(--color-surface-2)] rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}
