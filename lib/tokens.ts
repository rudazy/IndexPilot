import type { Token } from "./types";

export interface TokenCatalogEntry extends Token {
  coingeckoId: string;
  sosovalueCurrencyId?: string;
}

export const TOKEN_CATALOG: readonly TokenCatalogEntry[] = [
  {
    symbol: "BTC",
    name: "Bitcoin",
    decimals: 8,
    coingeckoId: "bitcoin",
    sosovalueCurrencyId: "bitcoin",
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    decimals: 18,
    coingeckoId: "ethereum",
    sosovalueCurrencyId: "ethereum",
  },
  {
    symbol: "SOL",
    name: "Solana",
    decimals: 9,
    coingeckoId: "solana",
    sosovalueCurrencyId: "solana",
  },
  {
    symbol: "BNB",
    name: "BNB",
    decimals: 18,
    coingeckoId: "binancecoin",
    sosovalueCurrencyId: "binancecoin",
  },
  {
    symbol: "AVAX",
    name: "Avalanche",
    decimals: 18,
    coingeckoId: "avalanche-2",
    sosovalueCurrencyId: "avalanche-2",
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    coingeckoId: "usd-coin",
    sosovalueCurrencyId: "usd-coin",
  },
] as const;

export const TOKEN_SYMBOLS = TOKEN_CATALOG.map((t) => t.symbol);

const bySymbol = new Map<string, TokenCatalogEntry>(
  TOKEN_CATALOG.map((t) => [t.symbol, t]),
);
const byCoingecko = new Map<string, TokenCatalogEntry>(
  TOKEN_CATALOG.map((t) => [t.coingeckoId, t]),
);

export function findTokenBySymbol(symbol: string): TokenCatalogEntry | undefined {
  return bySymbol.get(symbol.toUpperCase());
}

export function findTokenByCoingeckoId(id: string): TokenCatalogEntry | undefined {
  return byCoingecko.get(id);
}

export function tokenRegistry(): Map<string, Token> {
  return new Map(TOKEN_CATALOG.map((t) => [t.symbol, t]));
}
