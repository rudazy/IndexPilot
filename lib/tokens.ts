import type { Token } from "./types";

/**
 * Token catalog with mainnet ERC-20 addresses.
 *
 * Index assets are read from Ethereum mainnet. Non-EVM-native assets
 * (BTC, SOL, AVAX) are read via their canonical wrapped representations:
 *   - BTC  -> WBTC (BitGo, ERC-20)
 *   - SOL  -> Wormhole-wrapped SOL
 *   - AVAX -> Wormhole-wrapped AVAX
 *   - BNB  -> Binance legacy ERC-20
 *
 * `address` undefined means "read native ETH balance via useBalance".
 * Decimals match each contract's on-chain decimals so formatUnits()
 * produces correct human-readable values.
 *
 * Wrapped-asset addresses should be verified against the source registries
 * (etherscan, wormhole portal) before each production deploy.
 */

export interface TokenCatalogEntry extends Token {
  sosovalueCurrencyId: string;
  isNative?: boolean;
  bridge?: string;
}

export const TOKEN_CATALOG: readonly TokenCatalogEntry[] = [
  {
    symbol: "BTC",
    name: "Bitcoin",
    decimals: 8,
    address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    bridge: "WBTC",
    sosovalueCurrencyId: "1673723677362319866",
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    decimals: 18,
    isNative: true,
    sosovalueCurrencyId: "1673723677362319867",
  },
  {
    symbol: "SOL",
    name: "Solana",
    decimals: 9,
    address: "0xD31a59c85aE9D8edEFeC411D448f90841571b89c",
    bridge: "Wormhole",
    sosovalueCurrencyId: "1673723677362319875",
  },
  {
    symbol: "BNB",
    name: "BNB",
    decimals: 18,
    address: "0xB8c77482e45F1F44dE1745F52C74426C631bDD52",
    bridge: "Binance ERC-20",
    sosovalueCurrencyId: "1673723677362319869",
  },
  {
    symbol: "AVAX",
    name: "Avalanche",
    decimals: 18,
    address: "0x85f138bfEE4ef8e540890CFb48F620571d67Eda3",
    bridge: "Wormhole",
    sosovalueCurrencyId: "1673723677362319883",
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    sosovalueCurrencyId: "1673723677362319870",
  },
] as const;

export const TOKEN_SYMBOLS = TOKEN_CATALOG.map((t) => t.symbol);

const bySymbol = new Map<string, TokenCatalogEntry>(
  TOKEN_CATALOG.map((t) => [t.symbol, t]),
);

export function findTokenBySymbol(symbol: string): TokenCatalogEntry | undefined {
  return bySymbol.get(symbol.toUpperCase());
}

export function tokenRegistry(): Map<string, Token> {
  return new Map(TOKEN_CATALOG.map((t) => [t.symbol, t]));
}
