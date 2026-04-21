import { NextResponse } from "next/server";
import { findTokenBySymbol, findTokenByCoingeckoId } from "@/lib/tokens";
import type { PriceSnapshot } from "@/lib/types";

export const runtime = "nodejs";
export const revalidate = 60;

const SOSOVALUE_BASE = "https://openapi.sosovalue.com/openapi/v1";
const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

interface SosovalueSnapshot {
  currency_id?: string;
  symbol?: string;
  price?: number;
  price_usd?: number;
  change_24h?: number;
  change_24h_pct?: number;
  price_change_percentage_24h?: number;
}

interface CoingeckoSimplePriceEntry {
  usd: number;
  usd_24h_change?: number;
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

async function fromSosovalue(
  symbols: string[],
  apiKey: string,
): Promise<PriceSnapshot[]> {
  const fetchedAt = Date.now();
  const snapshots = await Promise.all(
    symbols.map(async (symbol): Promise<PriceSnapshot | null> => {
      const token = findTokenBySymbol(symbol);
      if (!token?.sosovalueCurrencyId) return null;

      const url = `${SOSOVALUE_BASE}/currencies/${token.sosovalueCurrencyId}/market-snapshot`;
      const res = await fetch(url, {
        headers: { "x-soso-api-key": apiKey },
        cache: "no-store",
      });
      if (!res.ok) return null;

      const json = (await res.json()) as SosovalueSnapshot;
      const priceUsd = json.price_usd ?? json.price;
      if (typeof priceUsd !== "number") return null;

      const change =
        json.change_24h_pct ??
        json.price_change_percentage_24h ??
        json.change_24h ??
        0;

      return {
        symbol,
        priceUsd,
        change24hPct: change,
        fetchedAt,
        source: "sosovalue",
      };
    }),
  );

  return snapshots.filter((s): s is PriceSnapshot => s !== null);
}

async function fromCoingecko(symbols: string[]): Promise<PriceSnapshot[]> {
  const ids = symbols
    .map((s) => findTokenBySymbol(s)?.coingeckoId)
    .filter((id): id is string => Boolean(id));
  if (ids.length === 0) return [];

  const url = `${COINGECKO_BASE}/simple/price?ids=${ids.join(",")}&vs_currencies=usd&include_24hr_change=true`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`CoinGecko responded ${res.status}`);
  }

  const data = (await res.json()) as Record<string, CoingeckoSimplePriceEntry>;
  const fetchedAt = Date.now();

  return Object.entries(data)
    .map(([coingeckoId, entry]): PriceSnapshot | null => {
      const token = findTokenByCoingeckoId(coingeckoId);
      if (!token) return null;
      return {
        symbol: token.symbol,
        priceUsd: entry.usd,
        change24hPct: entry.usd_24h_change ?? 0,
        fetchedAt,
        source: "coingecko",
      };
    })
    .filter((s): s is PriceSnapshot => s !== null);
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
  const fetchedAt = Date.now();

  if (apiKey) {
    try {
      const prices = await fromSosovalue(symbols, apiKey);
      if (prices.length === symbols.length) {
        return NextResponse.json(
          { prices, source: "sosovalue", fetchedAt },
          {
            headers: {
              "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
            },
          },
        );
      }
    } catch {
      // fall through to CoinGecko
    }
  }

  try {
    const prices = await fromCoingecko(symbols);
    return NextResponse.json(
      { prices, source: "coingecko", fetchedAt },
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
