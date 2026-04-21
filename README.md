# IndexPilot

Your personal on-chain index fund. Set weights, watch for drift, and get a precise rebalance plan with plain-English explanations.

## Stack

- Next.js 16 (app router) + React 19
- TypeScript strict mode
- Tailwind CSS v4
- wagmi v2 + viem v2
- RainbowKit 2.x for wallet connect
- @tanstack/react-query (5-minute stale time)
- Recharts for portfolio charts
- SoSoValue public API for live market data (server-side), with CoinGecko as automatic fallback

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Environment variables

| Variable | Purpose | Required |
| --- | --- | --- |
| `SOSOVALUE_API_KEY` | Server-side key for live price data from SoSoValue | No — falls back to CoinGecko |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect v2 project ID for RainbowKit | Recommended |
| `NEXT_PUBLIC_VALUECHAIN_TESTNET_CHAIN_ID` | ValueChain testnet chain ID | Needed for on-chain connectivity |
| `NEXT_PUBLIC_VALUECHAIN_TESTNET_RPC_URL` | ValueChain testnet RPC endpoint | Needed for on-chain connectivity |

The SoSoValue key is read server-side only; it is never shipped to the browser.

## Scripts

```bash
npm run dev        # start dev server
npm run build      # production build
npm run start      # serve production build
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
```

## Architecture

```
app/
  api/prices/route.ts   server-side price proxy (SoSoValue → CoinGecko fallback)
  setup/page.tsx        index builder
  dashboard/page.tsx    portfolio view + rebalance plan
  page.tsx              landing
  layout.tsx            providers + fonts + metadata
  providers.tsx         wagmi + react-query + rainbowkit
components/
  ui/                   Button, Card, Badge, Input primitives
  setup/                AllocationRow, TokenPicker, TriggerSelector
  dashboard/            PortfolioChart, TokenTable, DriftBar, RebalancePanel, ActivityLog
  Header.tsx            top nav + wallet button
  WalletButton.tsx      RainbowKit custom connect button
hooks/
  usePrices.ts          react-query price fetcher
  usePortfolio.ts       config + prices + simulated balances → PortfolioState
  useRebalance.ts       memoized rebalance plan generator
lib/
  types.ts              IndexConfig, PortfolioState, RebalancePlan, ActivityEvent
  rebalance.ts          drift math + plan generator + plain-English explainer
  storage.ts            versioned, typed localStorage wrapper
  tokens.ts             token registry with multi-source ids
  sosovalue.ts          client fetcher calling /api/prices
  sodex.ts              typed empty slot for SoDEX execution
  chains.ts             ValueChain testnet definition
  wagmi.ts              wagmi config with RainbowKit defaults
  utils.ts              cn, formatters, truncate, uid
```

### Price flow

1. Hook `usePrices(symbols)` calls `/api/prices?symbols=BTC,ETH,SOL`.
2. The API route picks the best source:
   - If `SOSOVALUE_API_KEY` is set, it proxies to SoSoValue's `/currencies/{id}/market-snapshot`.
   - Otherwise or on failure, it falls back to CoinGecko's `/simple/price`.
3. Response is normalized to `PriceSnapshot[]` with source tagging.
4. React Query caches results for 5 minutes; hooks refresh automatically.

### Rebalance logic

- `computePortfolio(config, balances, prices)` returns a `PortfolioState` with current weights, drift per asset, and a per-asset `DriftStatus` (on-target / mild / rebalance).
- `generateRebalancePlan(portfolio)` produces an ordered list of buy/sell orders that restore target weights plus a plain-English explanation.
- All logic is pure and framework-free, living in `lib/rebalance.ts`.

### Simulated holdings

Wave 1 does not yet read cross-chain wallet balances. On first dashboard visit we generate simulated balances from the index config + a $10k starting value, save them to localStorage, and recompute weights against live prices. As prices move, drift appears naturally. "Reset holdings" in the dashboard footer restarts the simulation.

### SoDEX execution

`lib/sodex.ts` holds typed client interfaces for quoting and executing rebalance orders through SoDEX. The factory throws until API access lands. The dashboard "Execute on SoDEX" button links to the SoDEX app for now; once the API key is issued, the factory gets an implementation and the button will deeplink with the rebalance plan attached.

## Security posture

- No secrets in frontend code or `.env.example`.
- `.npmrc` enforces a 7-day minimum release age on every install.
- Pinned dependency versions (`save-exact=true`).
- Price-source API key never leaves the server.
- All external input (URL params, JSON responses) is validated before use.

## License

Proprietary. All rights reserved.
