import { NextResponse } from "next/server";
import { findTokenBySymbol } from "@/lib/tokens";
import type { PriceSnapshot } from "@/lib/types";

export const runtime = "nodejs";
export const revalidate = 60;

const SOSOVALUE_BASE = "https://openapi.sosovalue.com/openapi/v1";

interface SosovalueMarketSnapshot {
  price?: number | string;
  change_pct_24h?: number | string;
}

interface SosovalueEnvelope<T> {
  code?: number;
  message?: string;
  data?: T;
}

export interface UpstreamCallMeta {
  symbol: string;
  currencyId: string;
  url: string;
  status: number;
  latencyMs: number;
  ok: boolean;
  error?: string;
}

interface SnapshotResult {
  snapshot: PriceSnapshot | null;
  meta: UpstreamCallMeta;
}

function normalizeSymbols(raw: string | null): string[] {
  if (!raw) return [];
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean),
    ),
  );
}

function toNumber(value: number | string | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

async function fetchSnapshot(
  symbol: string,
  currencyId: string,
  apiKey: string,
  fetchedAt: number,
): Promise<SnapshotResult> {
  const url = `${SOSOVALUE_BASE}/currencies/${encodeURIComponent(currencyId)}/market-snapshot`;
  const startedAt = Date.now();
  let status = 0;
  let error: string | undefined;
  let snapshot: PriceSnapshot | null = null;

  try {
    const res = await fetch(url, {
      headers: { "x-soso-api-key": apiKey },
      cache: "no-store",
    });
    status = res.status;

    if (!res.ok) {
      error = `HTTP ${res.status}`;
    } else {
      const envelope = (await res.json()) as SosovalueEnvelope<SosovalueMarketSnapshot>;
      if (envelope.code !== 0 || !envelope.data) {
        error = `envelope code ${envelope.code ?? "missing"}`;
      } else {
        const priceUsd = toNumber(envelope.data.price);
        if (priceUsd === null) {
          error = "missing price field";
        } else {
          const changeFraction = toNumber(envelope.data.change_pct_24h) ?? 0;
          snapshot = {
            symbol,
            priceUsd,
            change24hPct: changeFraction * 100,
            fetchedAt,
            source: "sosovalue",
          };
        }
      }
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "network error";
  }

  const latencyMs = Date.now() - startedAt;
  const meta: UpstreamCallMeta = {
    symbol,
    currencyId,
    url,
    status,
    latencyMs,
    ok: snapshot !== null,
    ...(error ? { error } : {}),
  };

  return { snapshot, meta };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbols = normalizeSymbols(searchParams.get("symbols"));

  if (symbols.length === 0) {
    return NextResponse.json(
      { error: "Missing or empty ?symbols= parameter." },
      { status: 400 },
    );
  }

  const apiKey = process.env.SOSOVALUE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "SOSOVALUE_API_KEY is not configured." },
      { status: 503 },
    );
  }

  const fetchedAt = Date.now();
  const requested = symbols.map((symbol) => ({
    symbol,
    currencyId: findTokenBySymbol(symbol)?.sosovalueCurrencyId,
  }));

  const unsupported = requested
    .filter((r) => !r.currencyId)
    .map((r) => r.symbol);
  if (unsupported.length > 0) {
    return NextResponse.json(
      { error: `Unsupported symbols: ${unsupported.join(", ")}` },
      { status: 400 },
    );
  }

  const startedAt = Date.now();

  try {
    const results = await Promise.all(
      requested.map((r) =>
        fetchSnapshot(r.symbol, r.currencyId as string, apiKey, fetchedAt),
      ),
    );

    const prices = results
      .map((r) => r.snapshot)
      .filter((s): s is PriceSnapshot => s !== null);
    const upstreamCalls = results.map((r) => r.meta);
    const totalLatencyMs = Date.now() - startedAt;
    const missing = symbols.filter((s) => !prices.find((p) => p.symbol === s));

    console.log(
      `[prices] symbols=${symbols.join(",")} ` +
        `upstream=${upstreamCalls.length} ` +
        `ok=${upstreamCalls.filter((c) => c.ok).length} ` +
        `total_latency=${totalLatencyMs}ms ` +
        `avg_upstream_latency=${Math.round(
          upstreamCalls.reduce((s, c) => s + c.latencyMs, 0) / upstreamCalls.length,
        )}ms`,
    );

    if (missing.length > 0) {
      return NextResponse.json(
        {
          error: `SoSoValue returned no data for: ${missing.join(", ")}`,
          meta: { upstreamCalls, totalLatencyMs },
        },
        { status: 502 },
      );
    }

    return NextResponse.json(
      {
        prices,
        source: "sosovalue",
        fetchedAt,
        meta: { upstreamCalls, totalLatencyMs },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Price fetch failed: ${message}` },
      { status: 502 },
    );
  }
}
