import { NextResponse } from "next/server";
import { fetchMarketSignals } from "@/lib/sosovalue-signals";
import { findTokenBySymbol } from "@/lib/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbols = normalizeSymbols(searchParams.get("symbols"));

  if (symbols.length === 0) {
    return NextResponse.json(
      { error: "Missing or empty ?symbols= parameter." },
      { status: 400 },
    );
  }

  const unsupported = symbols.filter((s) => !findTokenBySymbol(s));
  if (unsupported.length > 0) {
    return NextResponse.json(
      { error: `Unsupported symbols: ${unsupported.join(", ")}` },
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

  try {
    const result = await fetchMarketSignals(symbols, apiKey);
    const totalLatencyMs = result.upstreamCalls.reduce((s, c) => Math.max(s, c.latencyMs), 0);

    console.log(
      `[signals] symbols=${symbols.join(",")} urgency=${result.urgency} ` +
        `score=${result.score} signals=${result.signals.length} ` +
        `proxy=${result.usedProxy} upstream=${result.upstreamCalls.length} ` +
        `ok=${result.upstreamCalls.filter((c) => c.ok).length} latency=${totalLatencyMs}ms`,
    );

    return NextResponse.json(
      {
        urgency: result.urgency,
        score: result.score,
        signals: result.signals,
        usedProxy: result.usedProxy,
        computedAt: result.computedAt,
        meta: { upstreamCalls: result.upstreamCalls, totalLatencyMs },
      },
      {
        headers: {
          // ETF flow updates daily and momentum every few minutes; five
          // minutes matches the dashboard's price refresh cadence.
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Signal fetch failed: ${message}` },
      { status: 502 },
    );
  }
}
