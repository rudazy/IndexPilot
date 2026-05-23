# IndexPilot

A personal on-chain index fund with drift detection and AI-explained rebalancing.

## The problem

Manual portfolio rebalancing is tedious and error-prone. You set target weights, prices move, weights drift, and either you forget to rebalance or you rebalance reactively without a clear thesis. Most retail tooling either hides the math behind a black box or dumps raw numbers without context.

IndexPilot keeps the math transparent and the explanation specific. Every rebalance plan is a deterministic function of live prices, target weights, and a drift threshold — no hidden logic. Every plan is paired with a written briefing that cites the exact drift figures and 24-hour price moves that justify each trade.

## What it does

- Build a custom crypto index from a curated token list with live 100% allocation validation.
- Pull live market data from the SoSoValue API on a 5-minute cadence.
- Compute current weight, target weight, drift percentage, and status (on-target / mild / rebalance) per asset.
- Generate a deterministic rebalance plan: ordered buy/sell list with token amount, USD amount, and execution price.
- Write a structured AI briefing (headline, drift summary, trade rationale, risk note, confidence) for the current plan.
- Surface every upstream API call in the dashboard so users can verify the data path end to end.

## Architecture

```
┌───────────────┐    ┌──────────────────────┐    ┌─────────────────────┐
│ /setup        │    │ /dashboard            │    │ Settings (local)    │
│ Index builder │───▶│ Portfolio · Plan · AI │◀──▶│ IndexConfig in      │
│ (allocations) │    │ Briefing · API log    │    │ localStorage        │
└───────────────┘    └──────────┬───────────┘    └─────────────────────┘
                                │
                  ┌─────────────┼──────────────┐
                  ▼             ▼              ▼
        ┌────────────────┐ ┌──────────┐ ┌──────────────┐
        │ /api/prices    │ │ lib/      │ │ /api/briefing│
        │ proxy +        │ │ rebalance │ │ Claude       │
        │ snapshot map   │ │ (pure)    │ │ (Sonnet 4.6) │
        └────────┬───────┘ └─────┬─────┘ └──────┬───────┘
                 │               │              │
                 ▼               ▼              ▼
        ┌────────────────┐ ┌──────────┐ ┌──────────────┐
        │ SoSoValue      │ │ Portfolio │ │ Structured   │
        │ /market-       │ │ + Plan    │ │ briefing     │
        │  snapshot      │ │ objects   │ │ JSON         │
        └────────────────┘ └──────────┘ └──────────────┘
```

**Data flow per dashboard render:**

1. `usePrices(symbols)` calls `/api/prices?symbols=...`. The server route signs each per-symbol request with `x-soso-api-key` against `openapi.sosovalue.com/openapi/v1/currencies/{id}/market-snapshot`, normalizes the envelope, and returns `{ prices, source, fetchedAt, meta }` with one `upstreamCalls[]` entry per token.
2. `useWalletBalances` reads the connected wallet's ERC-20 balances from Ethereum mainnet (WBTC, WETH/native ETH, Wormhole-wrapped SOL and AVAX, BNB ERC-20, USDC) via wagmi's `useReadContracts`. `usePortfolio` joins those balances with live prices and computes per-asset drift via the pure `computePortfolio()` function in `lib/rebalance.ts`.
3. `useRebalance(portfolio)` runs `generateRebalancePlan()` to produce the ordered buy/sell list.
4. `useBriefing(portfolio, plan, prices, indexName)` POSTs the three objects to `/api/briefing`, which calls the Anthropic Messages API (`claude-sonnet-4-6`) with a prompt-cached system prompt and a Zod-validated structured response format, then returns `{ briefing, meta }`.
5. The dashboard mounts the orders, the structured briefing, and the API call log side by side.

## File structure

```
app/
  api/
    briefing/route.ts        AI briefing endpoint (Anthropic Messages API, structured Zod output)
    prices/route.ts          SoSoValue proxy with per-call metadata
  dashboard/page.tsx         Main app surface
  docs/                      Public docs site (six pages)
  setup/page.tsx             Index builder
  layout.tsx, providers.tsx  Fonts, metadata, query client, wallet providers
components/
  dashboard/
    AIBriefing.tsx           Structured briefing display (headline, drift, rationale, risk)
    ActivityLog.tsx          Rebalance event history
    ApiCallLog.tsx           Live SoSoValue + briefing call inspector
    DriftBar.tsx             Inline drift visualization
    PortfolioChart.tsx       Current vs target allocation donuts
    PriceSourceTag.tsx       Data-source label
    RebalancePanel.tsx       Orders list + briefing slot + execution button
    TokenTable.tsx           Holdings table with drift status
  setup/                     AllocationRow, TokenPicker, TriggerSelector
  ui/                        Button, Card, Badge, Input primitives
  Header.tsx, WalletButton.tsx, TestnetBadge.tsx
hooks/
  useBriefing.ts             React Query hook for /api/briefing
  usePortfolio.ts            Config + prices + balances -> PortfolioState
  usePrices.ts               React Query hook for /api/prices
  useRebalance.ts            Memoized plan generator
lib/
  apiCallLog.ts              In-memory pub/sub ring buffer of recent API calls
  chains.ts                  ValueChain testnet definition
  rebalance.ts               Pure drift math + plan generator
  sodex.ts                   Typed execution client (stub awaiting credentials)
  sosovalue.ts               Client-side price fetcher
  storage.ts                 Versioned typed localStorage wrapper
  tokens.ts                  Token registry with SoSoValue currency IDs
  types.ts                   IndexConfig, PortfolioState, RebalancePlan, ActivityEvent
  utils.ts                   cn, formatters, truncate, uid
  wagmi.ts                   Wagmi + RainbowKit config
```

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (app router) + React 19 |
| Language | TypeScript strict |
| Styling | Tailwind CSS v4 |
| UI primitives | Hand-rolled (Button, Card, Badge, Input) |
| State (server) | TanStack Query 5 (5-minute price stale time) |
| State (client) | useState + localStorage (versioned schema) |
| Wallet | wagmi v2 + viem v2 + RainbowKit 2 |
| Charts | Recharts 3 |
| Price data | SoSoValue Open API |
| AI briefing | Anthropic Messages API (`claude-sonnet-4-6`) with Zod-validated structured outputs and prompt caching |
| Execution | SoDEX (client slot — see Wave 2 status) |

## Setup

```bash
npm install
cp .env.example .env.local
# fill in the SOSOVALUE_API_KEY and ANTHROPIC_API_KEY values
npm run dev
```

Open `http://localhost:3000`.

## Environment variables

| Variable | Purpose | Required |
| --- | --- | --- |
| `SOSOVALUE_API_KEY` | Server-side key for SoSoValue market data. Read in `/api/prices` only. | Yes |
| `ANTHROPIC_API_KEY` | Server-side key for the Anthropic Messages API. Read in `/api/briefing` only. | Yes |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect v2 project ID for RainbowKit. | Recommended |
| `NEXT_PUBLIC_VALUECHAIN_TESTNET_CHAIN_ID` | ValueChain testnet chain ID. | For on-chain features |
| `NEXT_PUBLIC_VALUECHAIN_TESTNET_RPC_URL` | ValueChain testnet RPC endpoint. | For on-chain features |
| `SODEX_API_KEY` | SoDEX trading API key. | Pending — required once Wave 2 SoDEX client ships |

All API keys are read server-side. Nothing prefixed with `NEXT_PUBLIC_` carries a secret.

## Scripts

```bash
npm run dev        # start dev server
npm run build      # production build
npm run start      # serve production build
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
```

## Wave status

| Capability | Wave 1 | Wave 2 |
| --- | --- | --- |
| Index builder UI | shipped | shipped |
| Live prices (SoSoValue) | shipped | shipped + per-call metadata exposed |
| Drift math and plan generator | shipped | shipped |
| Rebalance plan UI | shipped | shipped |
| Activity log | shipped | shipped |
| Plan explanation | templated string | AI briefing (Anthropic, structured output) |
| Dashboard API inspector | not present | shipped |
| Documentation site | shipped | shipped |
| SoDEX execution | typed empty slot, deeplink button | pending — credentials in flight |
| On-chain balance reads | simulated from $10k seed | **shipped** — real Ethereum mainnet ERC-20 reads via wagmi |

### Wave 2 verification

Every dashboard render exposes the upstream API calls it made. The bottom of the dashboard shows a live log of SoSoValue and Anthropic requests with timestamp, endpoint, status, latency, and token usage. Server logs mirror the same data with `[prices]` and `[briefing]` prefixes for inspection in Vercel logs or local stdout.

## Security posture

- No secrets in client code, `.env.example`, or git history.
- `.npmrc` enforces a 7-day minimum release age on every install (`min-release-age=7`).
- Pinned dependency versions (`save-exact=true`).
- `SOSOVALUE_API_KEY` and `ANTHROPIC_API_KEY` are read server-side only and never appear in network responses.
- All API route inputs are schema-validated (Zod) before reaching upstream services.
- Anthropic SDK calls use typed exception classes (`AuthenticationError`, `RateLimitError`, `APIError`) instead of string matching on error messages.

## License

Proprietary. All rights reserved.
