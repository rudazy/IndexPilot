"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RefreshCw, Settings2, AlertTriangle, Wallet, Inbox } from "lucide-react";
import { Header } from "@/components/Header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { WalletButton } from "@/components/WalletButton";
import { PortfolioChart, ChartLegend } from "@/components/dashboard/PortfolioChart";
import { TokenTable } from "@/components/dashboard/TokenTable";
import { RebalancePanel } from "@/components/dashboard/RebalancePanel";
import { ActivityLog } from "@/components/dashboard/ActivityLog";
import { ApiCallLog } from "@/components/dashboard/ApiCallLog";
import { PriceSourceTag } from "@/components/dashboard/PriceSourceTag";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useRebalance } from "@/hooks/useRebalance";
import { useBriefing } from "@/hooks/useBriefing";
import { appendActivity, loadActivity } from "@/lib/storage";
import type { ActivityEvent } from "@/lib/types";
import type { SodexNetwork } from "@/lib/sodexTypes";
import { formatUsd, truncateAddress, uid } from "@/lib/utils";

export default function DashboardPage() {
  const router = useRouter();
  const {
    config,
    portfolio,
    prices,
    priceSource,
    fetchedAt,
    walletAddress,
    isWalletConnected,
    hasHoldings,
    network,
    isLoading,
    isError,
    error,
    refetch,
  } = usePortfolio();
  const plan = useRebalance(portfolio);
  const {
    briefing,
    meta: briefingMeta,
    isLoading: briefingLoading,
    isFetching: briefingFetching,
    isError: briefingError,
    error: briefingErrorObj,
    refetch: refetchBriefing,
  } = useBriefing(
    hasHoldings ? portfolio : null,
    hasHoldings ? plan : null,
    prices,
    config?.name ?? null,
  );

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
          cashUsd={portfolio?.cashUsd ?? 0}
          needsRebalance={needsRebalance}
          priceSource={priceSource}
          fetchedAt={fetchedAt}
          walletAddress={walletAddress}
          isWalletConnected={isWalletConnected}
          onRefresh={refetch}
        />

        {!isWalletConnected && <ConnectWalletPrompt />}

        {isWalletConnected && !hasHoldings && !isLoading && (
          <EmptyWalletBanner network={network} />
        )}

        {isError && (
          <div className="flex items-start gap-2 px-4 py-3 rounded-[8px] bg-[color:var(--color-danger-dim)] text-[color:var(--color-danger)] text-sm">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span className="min-w-0 break-words">
              Failed to load data:{" "}
              {error?.message ||
                "no error message — check the Live API calls panel and browser console."}
            </span>
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
              {!isWalletConnected ? (
                <ChartEmpty label="Connect a wallet to see your allocation." />
              ) : isLoading || !portfolio ? (
                <ChartSkeleton />
              ) : !hasHoldings ? (
                <ChartEmpty label="No holdings detected on Ethereum mainnet." />
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <PortfolioChart
                      holdings={portfolio.holdings}
                      mode="current"
                      totalUsd={portfolio.totalValueUsd}
                      cashUsd={portfolio.cashUsd}
                    />
                    <PortfolioChart
                      holdings={portfolio.holdings}
                      mode="target"
                      totalUsd={portfolio.totalValueUsd}
                    />
                  </div>
                  <ChartLegend
                    holdings={portfolio.holdings}
                    cashUsd={portfolio.cashUsd}
                    totalUsd={portfolio.totalValueUsd}
                  />
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
            {!isWalletConnected ? (
              <TableEmpty label="Connect a wallet to view your token balances." />
            ) : isLoading || !portfolio ? (
              <TableSkeleton rows={config.allocations.length} />
            ) : (
              <TokenTable
                holdings={portfolio.holdings}
                cashUsd={portfolio.cashUsd}
                totalUsd={portfolio.totalValueUsd}
              />
            )}
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Rebalance plan</CardTitle>
              <span className="text-xs text-[color:var(--color-fg-subtle)]">
                Deterministic orders · AI briefing
              </span>
            </CardHeader>
            <CardBody>
              {!isWalletConnected ? (
                <p className="text-sm text-[color:var(--color-fg-subtle)]">
                  Connect a wallet to generate a rebalance plan against your real holdings.
                </p>
              ) : !hasHoldings ? (
                <p className="text-sm text-[color:var(--color-fg-subtle)]">
                  Deposit one of the index tokens to your wallet to generate a rebalance plan.
                </p>
              ) : plan ? (
                <RebalancePanel
                  plan={plan}
                  briefing={briefing}
                  briefingMeta={briefingMeta}
                  briefingLoading={briefingLoading}
                  briefingFetching={briefingFetching}
                  briefingError={briefingError}
                  briefingErrorObj={briefingErrorObj}
                  onRefreshBriefing={refetchBriefing}
                  onRecompute={recordRebalance}
                />
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

        <ApiCallLog />

        <DataFooter
          pricesCount={prices.length}
          isWalletConnected={isWalletConnected}
          walletAddress={walletAddress}
          network={network}
        />
      </main>
    </div>
  );
}

function HeroBand({
  indexName,
  totalUsd,
  cashUsd,
  needsRebalance,
  priceSource,
  fetchedAt,
  walletAddress,
  isWalletConnected,
  onRefresh,
}: {
  indexName: string;
  totalUsd: number;
  cashUsd: number;
  needsRebalance: boolean;
  priceSource: "sosovalue" | null;
  fetchedAt: number | null;
  walletAddress: `0x${string}` | undefined;
  isWalletConnected: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[color:var(--color-border)] pb-6">
      <div>
        <p className="text-xs uppercase tracking-[0.15em] text-[color:var(--color-fg-subtle)]">
          {indexName}
        </p>
        <h1 className="text-[32px] sm:text-5xl font-normal mt-1 text-numeric">
          {formatUsd(totalUsd, 2)}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <PriceSourceTag source={priceSource} fetchedAt={fetchedAt} />
          {cashUsd > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs px-2 h-5 rounded-[4px] bg-[color:var(--color-surface-2)] text-[color:var(--color-fg-muted)] font-mono border border-[color:var(--color-border-strong)]">
              {formatUsd(cashUsd, 2)} USDC cash · deployable
            </span>
          )}
          {isWalletConnected && walletAddress && (
            <span className="inline-flex items-center gap-1.5 text-xs px-2 h-5 rounded-[4px] bg-[color:var(--color-surface-2)] text-[color:var(--color-fg-muted)] font-mono border border-[color:var(--color-border-strong)]">
              <Wallet className="h-3 w-3" />
              {truncateAddress(walletAddress)}
            </span>
          )}
          {needsRebalance && (
            <span className="text-xs px-2 h-5 inline-flex items-center rounded-[4px] bg-[color:var(--color-danger-dim)] text-[color:var(--color-danger)] uppercase tracking-wide">
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

function ConnectWalletPrompt() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-[12px] bg-[color:var(--color-surface)] border border-[color:var(--color-accent)]/40">
      <div className="flex items-start gap-3">
        <Wallet className="h-5 w-5 text-[color:var(--color-accent)] mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-[color:var(--color-fg)]">
            Connect your wallet to read live balances
          </p>
          <p className="text-xs text-[color:var(--color-fg-muted)] mt-1">
            Balances are read directly from Ethereum mainnet — WBTC, WETH (native ETH), Wormhole-wrapped SOL and AVAX, BNB ERC-20, USDC. No simulation.
          </p>
        </div>
      </div>
      <WalletButton />
    </div>
  );
}

function EmptyWalletBanner({ network }: { network: SodexNetwork }) {
  const isTestnet = network === "testnet";
  return (
    <div className="flex items-start gap-3 p-4 rounded-[10px] bg-[color:var(--color-warn-dim)] border border-[color:var(--color-warn)]/30">
      <Inbox className="h-4 w-4 text-[color:var(--color-warn)] mt-0.5 shrink-0" />
      <div className="space-y-0.5">
        <p className="text-sm text-[color:var(--color-fg)]">
          {isTestnet
            ? "No SoDEX testnet balance detected"
            : "No holdings detected on Ethereum mainnet"}
        </p>
        <p className="text-xs text-[color:var(--color-fg-muted)]">
          {isTestnet
            ? "Deposit funds into your SoDEX testnet account to populate the dashboard. Charts and the briefing will appear automatically."
            : "Deposit one of the index tokens to your connected wallet to populate the dashboard. Charts and the briefing will appear automatically."}
        </p>
      </div>
    </div>
  );
}

function ChartEmpty({ label }: { label: string }) {
  return (
    <div className="grid grid-cols-2 gap-4 h-[240px]">
      <div className="rounded-full border border-dashed border-[color:var(--color-border)] flex items-center justify-center" />
      <div className="rounded-full border border-dashed border-[color:var(--color-border)] flex items-center justify-center px-4 text-center text-xs text-[color:var(--color-fg-subtle)]">
        {label}
      </div>
    </div>
  );
}

function TableEmpty({ label }: { label: string }) {
  return (
    <div className="px-6 py-12 text-center text-sm text-[color:var(--color-fg-subtle)]">
      {label}
    </div>
  );
}

function DataFooter({
  pricesCount,
  isWalletConnected,
  walletAddress,
  network,
}: {
  pricesCount: number;
  isWalletConnected: boolean;
  walletAddress: `0x${string}` | undefined;
  network: SodexNetwork;
}) {
  const sourceLabel = network === "testnet" ? "SoDEX testnet" : "mainnet";
  const emptyLabel = network === "testnet" ? "no testnet account" : "wallet not connected";
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-[color:var(--color-border)] text-xs text-[color:var(--color-fg-subtle)] font-mono">
      <span>
        Balances: {isWalletConnected && walletAddress ? `${sourceLabel} · ${truncateAddress(walletAddress)}` : emptyLabel}
      </span>
      <span>
        {pricesCount} price source{pricesCount === 1 ? "" : "s"} active
      </span>
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
