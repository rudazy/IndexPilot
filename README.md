# IndexPilot

A personal on-chain index fund with drift detection, SoSoValue-driven timing signals, AI-explained rebalancing, and autonomous execution on SoDEX.

## The problem

Manual portfolio rebalancing is tedious and error-prone. You set target weights, prices move, weights drift, and either you forget to rebalance or you rebalance reactively without a clear thesis. Most retail tooling either hides the math behind a black box or dumps raw numbers without context.

IndexPilot keeps the math transparent and the explanation specific. Every rebalance plan is a deterministic function of live prices, target weights, and a drift threshold. Every plan is paired with a written briefing that cites the exact drift figures, 24-hour price moves, and institutional ETF flows behind each trade. And when auto mode is on, the loop closes itself: drift past threshold plus a live market signal triggers real execution.

## What it does

- Build a custom crypto index from a curated token list with live 100% allocation validation.
- Pull live market data from the SoSoValue API on a 5-minute cadence.
- Compute a market-signal urgency score (low / medium / high / urgent) from SoSoValue spot ETF net flows and 24h momentum, shown as a color-coded chip on the dashboard.
- Compute current weight, target weight, drift percentage, and status (on-target / mild / rebalance) per asset.
- Generate a deterministic rebalance plan: ordered buy/sell list with token amount, USD amount, and execution price.
- Write a structured AI briefing (headline, drift summary, trade rationale, risk note, confidence) that ties ETF flow and momentum signals to the plan.
- Execute the plan on SoDEX spot markets with server-side EIP-712 signing, then poll for fill confirmation and show fill price and quantity.
- Auto-rebalance: an opt-in loop that checks drift on a configurable cadence and executes without a click when drift breaches the threshold and the market signal is medium or above. Mainnet auto-execution requires an explicit confirmation.
- Track index value over time (7 days at 5-minute resolution) and chart it against the perfectly-balanced counterfactual.
- Persist every executed rebalance (timestamp, network, orders, notional, fill status, briefing headline) to a capped activity log.
- Surface every upstream API call in the dashboard so users can verify the data path end to end.

## Architecture

```
┌───────────────┐   ┌───────────────────────────────┐   ┌─────────────────────┐
│ /setup        │   │ /dashboard                    │   │ localStorage        │
│ Index builder │──▶│ Portfolio · Signal chip · AI  │◀─▶│ config · activity   │
│ + auto toggle │   │ Briefing · Performance · Log  │   │ history · settings  │
└───────────────┘   └──────────────┬────────────────┘   └─────────────────────┘
                                   │
        ┌──────────────┬───────────┼─────────────┬────────────────┐
        ▼              ▼           ▼             ▼                ▼
┌──────────────┐ ┌────────────┐ ┌──────────┐ ┌──────────────┐ ┌──────────────┐
│ /api/prices  │ │ /api/      │ │ lib/     │ │ /api/briefing│ │ /api/sodex   │
│ snapshot     │ │ signals    │ │ rebalance│ │ Claude       │ │ quote · sign │
│ proxy        │ │ ETF flows +│ │ (pure)   │ │ (Sonnet 4.6) │ │ execute ·    │
│              │ │ momentum   │ │          │ │              │ │ fill status  │
└──────┬───────┘ └─────┬──────┘ └────┬─────┘ └──────┬───────┘ └──────┬───────┘
       │               │             │              │                │
       ▼               ▼             ▼              ▼                ▼
┌──────────────┐ ┌────────────┐ ┌──────────┐ ┌──────────────┐ ┌──────────────┐
│ SoSoValue v1 │ │ SoSoValue  │ │ Portfolio│ │ Structured   │ │ SoDEX spot   │
│ /market-     │ │ v2 /etf/*  │ │ + Plan   │ │ briefing     │ │ engine       │
│  snapshot    │ │ endpoints  │ │ objects  │ │ JSON         │ │ (EIP-712)    │
└──────────────┘ └────────────┘ └──────────┘ └──────────────┘ └──────────────┘
```

**Data flow per dashboard render:**

1. `usePrices(symbols)` calls `/api/prices?symbols=...`. The server route signs each per-symbol request with `x-soso-api-key` against `openapi.sosovalue.com/openapi/v1/currencies/{id}/market-snapshot`, normalizes the envelope, and returns `{ prices, source, fetchedAt, meta }` with one `upstreamCalls[]` entry per token.
2. `useSignals(symbols)` calls `/api/signals?symbols=...`. The server fetches SoSoValue v2 ETF net-flow data (`/openapi/v2/etf/historicalInflowChart` for `us-btc-spot` and `us-eth-spot`) plus 24h momentum per index asset, scores each signal 0-3 against configurable thresholds (`lib/sosovalue-signals.ts`), and returns the combined `RebalanceUrgency`. If the ETF endpoints are unavailable on the API plan, 24h momentum stands in as the flow proxy and is labeled as such in the UI.
3. Balances are read from the connected wallet on Ethereum mainnet (wagmi `useReadContracts`) or from the SoDEX account on testnet. `usePortfolio` joins balances with prices and computes per-asset drift via the pure `computePortfolio()` in `lib/rebalance.ts`.
4. `useRebalance(portfolio)` runs `generateRebalancePlan()` to produce the ordered buy/sell list.
5. `useBriefing(portfolio, plan, prices, indexName, signals)` POSTs everything to `/api/briefing`, which calls the Anthropic Messages API (`claude-sonnet-4-6`) with a prompt-cached system prompt and a Zod-validated structured response format. The signal block lets the briefing connect institutional flows to the drift ("BTC ETF took in $2.1B while your BTC leg sits 8% under target").
6. `useValueHistory` records a `{ timestamp, totalValueUsd, targetUsd, network }` snapshot at most every 5 minutes (7-day retention) and feeds the performance chart: actual index value vs the perfectly-balanced counterfactual.
7. Execution: quote maps plan legs onto SoDEX markets (step sizes, minimum notionals, fees); execute signs a `batchNewOrder` action with EIP-712 server-side and submits it. After acceptance, `/api/sodex` `orderStatus` polls `GET /accounts/{addr}/orders` every 3 seconds for up to 60 seconds to confirm fills.
8. Auto mode (`useAutoRebalance`): while enabled, drift is re-checked on the configured cadence. Execution fires only when the index uses a drift trigger, drift breaches it, urgency is medium or above, and (on mainnet) the user confirmed auto-execution in a modal. One execution per plan fingerprint plus a full-interval cooldown prevent refires.

## File structure

```
app/
  api/
    briefing/route.ts        AI briefing endpoint (Anthropic Messages API, structured Zod output)
    prices/route.ts          SoSoValue price proxy with per-call metadata
    signals/route.ts         SoSoValue signal layer (ETF flows + momentum -> urgency)
    sodex/route.ts           SoDEX quote / execute / balances / order-status actions
  dashboard/page.tsx         Main app surface
  docs/                      Public docs site (six pages)
  setup/page.tsx             Index builder + automation settings
  layout.tsx, providers.tsx  Fonts, metadata, query client, wallet providers
components/
  dashboard/
    AIBriefing.tsx           Structured briefing display (headline, drift, rationale, risk)
    ActivityLog.tsx          Persistent executed-rebalance history
    ApiCallLog.tsx           Live SoSoValue + signals + briefing + SoDEX call inspector
    MarketSignalChip.tsx     Urgency chip with per-signal tooltip
    PerformanceChart.tsx     Index value vs target counterfactual (recharts)
    PortfolioChart.tsx       Current vs target allocation donuts
    RebalancePanel.tsx       Orders, quote/execute flow, fill confirmation
    TokenTable.tsx, DriftBar.tsx, PriceSourceTag.tsx
  setup/                     AllocationRow, TokenPicker, TriggerSelector, AutoRebalanceToggle
  ui/                        Button, Card, Badge, Input, Toaster primitives
  Header.tsx, NetworkSwitcher.tsx, WalletButton.tsx
hooks/
  useAutoRebalance.ts        Autonomous drift-check + execute loop with safety gates
  useBriefing.ts             React Query hook for /api/briefing
  useOrderFills.ts           3s/60s fill-status polling after execution
  usePortfolio.ts            Config + prices + balances -> PortfolioState
  usePrices.ts, useSignals.ts, useRebalance.ts, useSodex.ts,
  useSodexBalances.ts, useWalletBalances.ts, useValueHistory.ts
lib/
  activityLog.ts             Persistent rebalance log (localStorage, capped at 50)
  apiCallLog.ts              In-memory pub/sub ring buffer of recent API calls
  autoRebalance.ts           Auto-mode settings (enabled, cadence, mainnet clearance)
  rebalance.ts               Pure drift math + plan generator
  signalTypes.ts             Client-safe signal types + urgency ranking
  sodex.ts                   Server-only SoDEX client (markets, EIP-712 signing, fills)
  sodexTypes.ts              Client-safe SoDEX types
  sosovalue.ts               Client-side price fetcher
  sosovalue-signals.ts       Server-only signal fetch + urgency scoring
  storage.ts                 Versioned typed localStorage wrapper (index config)
  toast.ts                   Toast pub/sub (auto-execution notifications)
  tokens.ts                  Token registry with SoSoValue currency IDs
  valueHistory.ts            7-day value snapshots + target counterfactual
  types.ts, utils.ts, chains.ts, wagmi.ts
```

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (app router) + React 19 |
| Language | TypeScript strict |
| Styling | Tailwind CSS v4 |
| UI primitives | Hand-rolled (Button, Card, Badge, Input, Toaster) |
| State (server) | TanStack Query 5 (5-minute price stale time) |
| State (client) | useState + localStorage (versioned schema) |
| Wallet | wagmi v2 + viem v2 + RainbowKit 2 |
| Charts | Recharts 3 |
| Market data | SoSoValue Open API (v1 snapshots, v2 ETF flows) |
| AI briefing | Anthropic Messages API (`claude-sonnet-4-6`) with Zod-validated structured outputs and prompt caching |
| Execution | SoDEX spot (server-side EIP-712 signing, validated on mainnet with a real fill) |

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
| `SOSOVALUE_API_KEY` | Server-side key for SoSoValue market data. Read in `/api/prices` and `/api/signals`. | Yes |
| `ANTHROPIC_API_KEY` | Server-side key for the Anthropic Messages API. Read in `/api/briefing` only. | Yes |
| `SODEX_SIGNER_PRIVATE_KEY` | Private key of the SoDEX API wallet; signs trading actions server-side. | For execution |
| `SODEX_API_KEY_NAME` | Registered SoDEX API key name (X-API-Key header). | For execution |
| `SODEX_ACCOUNT_ID` | Optional numeric account id override. | Optional |
| `SODEX_ACCOUNT_ADDRESS` | Optional account address (defaults to the signer's). | Optional |
| `SODEX_NETWORK` | `mainnet` (default) or `testnet`. Mainnet places real orders. | Recommended |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect v2 project ID for RainbowKit. | Recommended |

All API keys and the signing key are read server-side. Nothing prefixed with `NEXT_PUBLIC_` carries a secret.

## Scripts

```bash
npm run dev        # start dev server
npm run build      # production build
npm run start      # serve production build
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
```

## Wave status

| Capability | Wave 1 | Wave 2 | Wave 3 |
| --- | --- | --- | --- |
| Index builder UI | shipped | shipped | + automation settings |
| Live prices (SoSoValue) | shipped | + per-call metadata | shipped |
| SoSoValue signal layer (ETF flows, momentum, urgency) | not present | not present | **shipped** |
| Drift math and plan generator | shipped | shipped | shipped |
| Plan explanation | templated string | AI briefing (structured output) | + signal-aware timing context |
| SoDEX execution | typed empty slot | **shipped** (EIP-712, validated with a real mainnet fill) | + fill confirmation polling |
| Auto-triggered rebalancing | not present | not present | **shipped** (drift + urgency gated, mainnet confirm) |
| Activity log | in-memory only | in-memory only | **persistent** (localStorage, fill status, 50 entries) |
| Performance chart (actual vs target) | not present | not present | **shipped** (7 days, 5-min snapshots) |
| On-chain balance reads | simulated | **shipped** (mainnet ERC-20 + SoDEX testnet account) | shipped |
| Dashboard API inspector | not present | shipped | + signals and auto-execution entries |
| Documentation site | shipped | shipped | shipped |

### Wave 3 verification

The dashboard exposes everything the agent does. The Market Signal chip shows the current urgency with a tooltip listing each contributing signal and its source (real ETF flow vs labeled momentum proxy). The Live API calls tray logs every `/api/prices`, `/api/signals`, `/api/briefing`, and `/api/sodex` request with status, latency, and (for the briefing) token usage; auto-executions appear there and in the activity log tagged `auto`. Server logs mirror the same data under `[prices]`, `[signals]`, `[briefing]`, and `[sodex]` prefixes.

## Security posture

- No secrets in client code, `.env.example`, or git history.
- `.npmrc` enforces a 7-day minimum release age on every install (`min-release-age=7`).
- Pinned dependency versions (`save-exact=true`).
- All API keys and the SoDEX signing key are read server-side only and never appear in network responses.
- All API route inputs are schema-validated (Zod) before reaching upstream services.
- Auto-execution on mainnet is double-gated: an explicit confirmation modal at enable time, re-checked at fire time; disabling auto mode revokes the clearance.
- Anthropic SDK calls use typed exception classes (`AuthenticationError`, `RateLimitError`, `APIError`) instead of string matching on error messages.

## License

Proprietary. All rights reserved.
