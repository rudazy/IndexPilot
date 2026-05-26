# IndexPilot — todo

Started: 2026-04-21

## Project

One-person agentic on-chain index rebalancer. User defines a custom index (tokens + target weights), agent monitors portfolio, detects drift, proposes exact rebalance orders, explains in plain English. Execution (SoDEX) is a clean placeholder for Wave 1.

## Stack

Next.js 14 app router, TS strict, Tailwind + shadcn/ui, wagmi v2 + viem v2, react-query, recharts, SoSoValue public API. SoDEX: typed slot only.

## Wave 1 scope

- `/` landing
- `/setup` index builder
- `/dashboard` main app with live prices, drift detection, rebalance orders, AI explanation, activity log

## Current task

SoSoValue API key wired in as the sole price source (2026-05-06). CoinGecko fallback fully removed. Live smoke test against `/currencies/{id}/market-snapshot` returns BTC/ETH/SOL/BNB/AVAX/USDC with realistic prices and 24h percent changes. Typecheck + lint clean.

## Completed 2026-05-06 — SoSoValue primary

- `app/api/prices/route.ts` — rewritten to call SoSoValue only. Unwraps the `{code, message, data}` envelope, multiplies `change_pct_24h` (fraction) into a percent, returns 503 if `SOSOVALUE_API_KEY` missing, 400 for unsupported symbols, 502 if SoSoValue returns no data. Header `x-soso-api-key` per official docs (sosovalue.gitbook.io/soso-value-api-doc).
- `lib/tokens.ts` — replaced CoinGecko slugs with real SoSoValue numeric `currency_id` values (BTC `…866`, ETH `…867`, BNB `…869`, USDC `…870`, SOL `…875`, AVAX `…883`) discovered by hitting `/currencies`. Removed `coingeckoId`, `findTokenByCoingeckoId`, `byCoingecko` map.
- `lib/sosovalue.ts`, `lib/types.ts`, `hooks/usePrices.ts`, `hooks/usePortfolio.ts`, `app/dashboard/page.tsx` — narrowed `source` / `priceSource` unions from `"sosovalue" | "coingecko"` to `"sosovalue"`.
- `components/dashboard/PriceSourceTag.tsx` — hardcoded "SoSoValue" label, dropped LABEL map.
- `README.md`, `app/docs/_content/drift-detection.tsx`, `app/docs/_content/faq.tsx` — removed every CoinGecko mention; FAQ now states `SOSOVALUE_API_KEY` is required.
- Verified: typecheck (0 errors), lint (0 warnings), live `/api/prices?symbols=BTC,ETH,SOL,BNB,AVAX,USDC` → 200, all six tokens populated.

## Earlier — docs section (2026-04-22)

`/docs` + `/docs/[slug]` with sidebar nav, six pages written (Getting Started, Drift Detection, Setup Guide, Rebalance Plan, Executing on SoDEX, FAQ). Build passes.

## Completed this session

**Phase 1 — scaffold + deps**
- Next.js 16.2.4 + React 19 + Tailwind 4 + TS strict
- `.npmrc` with `min-release-age=7`, `save-exact=true`, `audit=true`
- `.env.example` with placeholders
- Deps pinned: wagmi 2.19.5, viem 2.48.2, react-query 5.99.2, rainbowkit 2.2.10, recharts 3.8.1, lucide-react 1.8.0, cva, clsx, tailwind-merge

**Phase 2 — core libs**
- `lib/types.ts`, `lib/rebalance.ts`, `lib/storage.ts`, `lib/sosovalue.ts`, `lib/sodex.ts`, `lib/chains.ts`, `lib/tokens.ts`, `lib/utils.ts`, `lib/wagmi.ts`
- `app/api/prices/route.ts` — server-side proxy with SoSoValue → CoinGecko fallback

**Phase 3 — providers + layout + design tokens**
- `app/providers.tsx` — wagmi + react-query + rainbowkit with dark theme
- `app/layout.tsx` — Instrument Serif display + Geist Sans + Geist Mono, proper metadata
- `app/globals.css` — complete design token set (canvas, surface, fg, accent, success/warn/danger, radii, shadows, fade-in-up utility)

**Phase 4 — UI**
- `components/ui/` Button, Card, Badge, Input
- `components/Header.tsx`, `components/WalletButton.tsx`, `components/TestnetBadge.tsx`
- `components/setup/` AllocationRow, TokenPicker, TriggerSelector
- `components/dashboard/` PortfolioChart, TokenTable, DriftBar, RebalancePanel, ActivityLog, PriceSourceTag
- `hooks/` usePrices, usePortfolio, useRebalance
- `app/page.tsx` landing with Instrument Serif italic accent, hero preview panel with live drift bars
- `app/setup/page.tsx` index builder with live 100% validation, even-split helper, validation hints
- `app/dashboard/page.tsx` two-chart layout (current vs target), dense holdings table with inline drift bars, rebalance panel with AI explanation, activity log, manual rebalance button

**Phase 5 — verify**
- `tsc --noEmit` → 0 errors
- `eslint . --ext .ts,.tsx` → 0 errors, 0 warnings
- `next build` → 7 static pages generated, `/api/prices` dynamic; only warning is Reown/WalletConnect config fetch (expected with placeholder projectId)

**Phase 6 — docs section (2026-04-22)**
- `app/docs/layout.tsx` — 240px fixed sidebar + content column, dark theme
- `app/docs/_components/DocsSidebar.tsx` — active-state highlighting (#ff6a00), mobile hamburger + overlay, "Back to app" footer link
- `app/docs/page.tsx` — redirects to `/docs/getting-started`
- `app/docs/[slug]/page.tsx` — generateStaticParams for all six slugs, notFound() fallback, prev/next pagination
- `app/docs/_lib/nav.ts` — sidebar nav source of truth (DOC_SECTIONS, type-safe DocSlug)
- `app/docs/_content/*.tsx` — six content components, no placeholders
- `.docs-prose` CSS in globals.css using `:where()` for zero-specificity defaults
- Header: Docs nav link added between Index and Dashboard
- Landing hero: subtle "How it works →" link under CTA buttons → /docs/getting-started
- Build: 7 → 13 pages (all six doc slugs prerendered SSG), typecheck + lint clean

## README

Written at `/README.md`. No AI or program attribution. Documents stack, env vars, scripts, architecture, price flow, rebalance logic, simulated-holdings rationale, and security posture.

## Wave 2 — 2026-05-22 (in progress)

Started: 2026-05-22. Wave 1 scored 306/500 (Functionality 57, Data/API 57 lowest). Edgework competitor scored 351 on README + Claude integration + clean modules. SoSoValue API is live; Ludarep now has SoDEX API docs.

### Wave 2 priorities (Ludarep decided in order)
1. **Real SoDEX execution** — `lib/sodex.ts` stub → real client with quote/execute/tx receipt. **Waiting on Ludarep to paste API docs.**
2. **AI Briefing panel** — Claude API integration replacing the templated `plan.explanation`. **DONE this session.**
3. **README rewrite** — sharp problem statement, architecture diagram, file tree, Wave 2 checklist.
4. **API visibility** — structured logging on `/api/prices` + dashboard tray showing live SoSoValue calls.

### Completed this session 2026-05-22 — AI Briefing panel

**New files**
- `app/api/briefing/route.ts` — POST endpoint. Uses `claude-sonnet-4-6` (cost/latency choice over Opus 4.7), Zod-validated request body, structured Zod output via `output_config.format` + `zodOutputFormat()`, prompt-cached system prompt (~2.5K tokens, hits Sonnet 4.6's 2048-token caching minimum). Returns `{briefing: {headline, drift_summary, trade_rationale, risk_note, confidence}, meta: {model, latencyMs, usage}}`. Typed Anthropic exceptions (`AuthenticationError`, `RateLimitError`, `APIError`). Console-logs every call with token usage + cache hit metrics for judge inspection.
- `hooks/useBriefing.ts` — React Query hook keyed on `[indexName, planFingerprint]` (rounded-USD order signature), 5-min staleTime, no auto-retry, no window-focus refetch. Auto-fires when portfolio + plan + prices ready and `totalValueUsd > 0`. Re-fires only when plan orders materially change.
- `components/dashboard/AIBriefing.tsx` — structured display with distinct sections (headline + accent block, drift summary, trade rationale, risk note as warn-tone). Confidence badge (high=success / medium=warn / low=neutral). Skeleton during load. Error fallback renders the deterministic `plan.explanation` so the UI never goes blank. Subtle footer shows `model · latencyMs · in/out tokens · cache hit` in mono font + manual refresh button.

**Modified files**
- `components/dashboard/RebalancePanel.tsx` — removed hand-rolled explanation block (was lines 18-23). Now renders `<AIBriefing>` at the top, then orders list, then footer buttons. Accepts briefing props from parent.
- `app/dashboard/page.tsx` — wired `useBriefing(portfolio, plan, prices, config?.name)`, passes results to RebalancePanel. Updated card subtitle "AI-generated orders" → "Deterministic orders · AI briefing" (was misleading; orders are pure math, briefing is the AI).
- `.env.example` — added `ANTHROPIC_API_KEY=`.
- `package.json` — added `@anthropic-ai/sdk@0.98.0`, `zod@4.4.3` (both `--save-exact` per `.npmrc`).

**Verification**
- `npx tsc --noEmit` → 0 errors
- `npx eslint . --ext .ts,.tsx` → clean
- `npm run build` → 13 pages, `/api/briefing` registered as dynamic route, no warnings

**Pending for Ludarep before this is fully testable**
- Set `ANTHROPIC_API_KEY=sk-ant-...` in `.env.local` (currently absent). Without it, the endpoint returns 503 with a clear error message and the UI falls back to the deterministic explanation.

### Completed this session 2026-05-22 (cont.) — README + API visibility

**README rewrite** — `README.md` fully replaced. New structure: sharp problem statement up top, "What it does" bullets, ASCII architecture diagram showing /setup → /dashboard → API routes → upstream services, per-step data flow narrative, file tree, stack table, setup, env vars table (including `ANTHROPIC_API_KEY` and `SODEX_API_KEY`), **Wave 1 vs Wave 2 status table**, Wave 2 verification note pointing at the new API inspector + server logs, security posture, license. No emojis, no buildathon/AI-tool attribution per `feedback_no_attribution`.

**Server-side API call metadata**
- `app/api/prices/route.ts` — refactored `fetchSnapshot` to track per-call status + latency + error string. Returns `meta: { upstreamCalls: [...], totalLatencyMs }` alongside `prices`. Each `UpstreamCallMeta` entry has `{ symbol, currencyId, url, status, latencyMs, ok, error? }`. Added structured `[prices]` stdout log with symbols/upstream count/ok count/total + avg latency.
- `app/api/briefing/route.ts` — added `upstreamCalls: [{ url, status, latencyMs, ok }]` to meta (single Anthropic call), preserving the existing `[briefing]` stdout log.
- `lib/sosovalue.ts` — `PriceApiResponse` now types `meta` field; added exported `UpstreamCallMeta` interface.

**Client-side API call log + dashboard tray**
- `lib/apiCallLog.ts` — module-level pub/sub ring buffer (30 entries). Exports `addApiCall`, `clearApiCalls`, `getApiCalls`, `subscribeApiCalls`. Each entry has `{ id, source, timestamp, endpoint, upstreamUrl, status, ok, latencyMs, summary, detail?, tokens? }`.
- `hooks/usePrices.ts` — added `useEffect` keyed on `query.dataUpdatedAt` to push one entry per upstream call + one aggregate batch entry on every successful fetch. Separate effect logs errors. Uses `useRef` to dedupe on `dataUpdatedAt`.
- `hooks/useBriefing.ts` — same pattern: pushes one entry on each successful briefing with token usage attached, plus an error effect. Updated `BriefingMeta` type to include `upstreamCalls`.
- `components/dashboard/ApiCallLog.tsx` — collapsible tray (expanded by default for judging visibility). Uses `useSyncExternalStore` to subscribe. Each row: status dot, color-coded source badge (`soso` accent / `claude` warn), HH:MM:SS timestamp (mono), summary, latency, HTTP status. Click row to expand → shows full upstream URL, optional detail (error), token usage for briefing calls. Clear button in header.
- `app/dashboard/page.tsx` — mounted `<ApiCallLog />` between the main grid and the dev footer.

**Verification**
- `npx tsc --noEmit` → 0 errors
- `npx eslint . --ext .ts,.tsx` → 0 warnings (fixed one unused-var in prices route)
- `npm run build` → 13 pages, both API routes registered as dynamic

### Completed 2026-05-23 — Real on-chain balance reads

Replaced simulated holdings with live wallet reads against Ethereum mainnet. Decision (Ludarep, in review session): use Ethereum mainnet wrapped-asset ERC-20s for the full index catalog; empty wallet shows zero portfolio + deposit prompt (no fallback to simulated).

**New/updated files**
- `lib/tokens.ts` — added `address` and `bridge` fields to every catalog entry. BTC -> WBTC, ETH -> native (via `isNative: true`), SOL -> Wormhole, BNB -> Binance ERC-20, AVAX -> Wormhole, USDC -> canonical. Comments document the source registries (etherscan, wormhole portal). Wormhole-wrapped SOL/AVAX addresses should be verified before each production deploy.
- `hooks/useWalletBalances.ts` — new. Uses wagmi `useAccount` + `useBalance` (native ETH) + `useReadContracts` (ERC-20 `balanceOf` via viem's `erc20Abi`). Pinned to `mainnet.id` regardless of wallet's current network so users don't need to switch. Returns human-readable balances via `formatUnits`, plus raw bigint for downstream signing precision later.
- `hooks/usePortfolio.ts` — fully rewritten. Removed simulated balance generation, `SimulatedHoldings` dependency, `resetHoldings`, and the `holdings` localStorage state. Joins live prices with wallet balances. Returns new fields: `walletAddress`, `isWalletConnected`, `hasHoldings`.
- `app/dashboard/page.tsx` — added three states:
  1. **Not connected**: `ConnectWalletPrompt` banner with embedded `<WalletButton />`. Charts/table show empty placeholders with "Connect a wallet" copy.
  2. **Connected but empty**: `EmptyWalletBanner` warning + "Deposit one of the index tokens" copy in the rebalance panel slot. AI briefing is suppressed (won't fire) so we don't waste tokens on a zero portfolio.
  3. **Connected with holdings**: normal flow as before.
  Hero band now shows the connected wallet address (truncated, mono font, in a chip). Removed `DevFooter`/"Reset holdings" button — balances are real, nothing to reset. Replaced with `DataFooter` showing wallet connection state.
- `lib/storage.ts` — removed `loadHoldings`/`saveHoldings`/`clearHoldings` and the `holdings` field from `StoredAppState`. Schema version stays at 1 (existing localStorage configs still parse; extra `holdings` field is ignored on read and stripped on next write).
- `lib/types.ts` — removed `SimulatedHoldings` interface and `holdings` field from `StoredAppState`.
- `app/setup/page.tsx` — removed `clearHoldings()` call after `saveConfig` (no longer needed).
- `app/docs/_content/setup-guide.tsx` — updated paragraph to describe real wallet read flow instead of $10k simulated seed.
- `README.md` — updated price-flow narrative (step 2) and Wave 2 status table row for on-chain balance reads.

**Verification**
- `npx tsc --noEmit` -> 0 errors
- `npx eslint . --ext .ts,.tsx` -> 0 warnings
- `npm run build` -> 13 pages, both API routes registered, no warnings

### Completed 2026-05-23 (cont.) — Real SoDEX spot execution client

Decision (Ludarep, this session): **single-account, server-signs** model. SoDEX auth is Hyperliquid-style (API key NAME in header + private-key EIP-712 signing), which a browser wallet cannot do, so signing happens server-side with one key. Per-user browser signing was rejected as not supported by SoDEX.

SECURITY: Ludarep pasted a raw private key + address in chat. Flagged as compromised; Ludarep chose "will rotate, build anyway". Code reads the key only from `process.env.SODEX_SIGNER_PRIVATE_KEY` — never hardcoded. Ludarep must rotate before any real execution. Note: the pasted address `0xA9F4…2558` currently returns `aid:0` (no SoDEX spot account) — execution will 4xx until an account is created/funded there.

Research: SoDEX docs (sodex.com/documentation/api/api) + sodex-go-sdk-public. Confirmed action `batchNewOrder`, exact Go struct field order (symbolID, clOrdID, side, type, timeInForce, price?, quantity?, funds?), enums (Buy=1/Sell=2, Limit=1/Market=2, GTC=1/FOK=2/IOC=3, SignatureTypeEIP712=1), EIP-712 domain (name "spot", v "1", chainId 286623 mainnet / 138565 testnet, verifyingContract zero). Verified live: `/markets/symbols` (all of BTC/ETH/SOL/BNB/AVAX have TRADING USDC markets; quote asset USDC; `id`=symbolID; step/tick/minNotional($5)/precisions) and `/accounts/{addr}/state` (`data.aid`).

**New files**
- `lib/sodexTypes.ts` — client-safe types + constants (SodexQuote, SodexAccountInfo, SodexExecuteResponse, SODEX_APP_URL). No secrets, importable by client.
- `lib/sodex.ts` — server-only (`import "server-only"`). Full client: env-driven config (mainnet default, `SODEX_NETWORK=testnet` switch), `getSigner()` (validates key + API-key-name regex), `fetchMarkets()` → symbol→market map, `resolveAccount()` (SODEX_ACCOUNT_ID override → else `/accounts/{addr}/state` aid; addr = SODEX_ACCOUNT_ADDRESS ?? signer), `quotePlan()` (maps orders to markets, floors qty to step / funds to quote precision, trims trailing zeros to match shopspring, gates on minNotional + USDC-is-cash + halted + dust), and the signing pipeline: compact-JSON payload → keccak256 payloadHash → viem `signTypedData(ExchangeAction)` → v normalised 27/28→0/1 → `0x01` prefix → POST `/trade/orders/batch` with X-API-Key/X-API-Sign/X-API-Nonce. Market orders: buy uses `funds` (USDC), sell uses `quantity` (base), TIF=IOC. Monotonic ms nonce.
- `app/api/sodex/route.ts` — POST, Zod discriminated union `action: "quote" | "execute"`. SodexConfigError → 503, other → 502. `[sodex]` stdout logs.
- `hooks/useSodex.ts` — quote + execute mutations (React Query), pushes every call to `apiCallLog` with `source: "sodex"`.

**Modified files**
- `components/dashboard/RebalancePanel.tsx` — replaced the static "Execute on SoDEX" deeplink with a multi-step flow: Preview on SoDEX (quote) → quote summary (tradable legs w/ qty/funds + fees, skipped legs w/ reasons, account readiness) → Execute N orders → result panel (per-order status/orderId). Cancel/Done reset. Import of SODEX_APP_URL moved to `lib/sodexTypes` (RebalancePanel is a client component; `lib/sodex` is server-only and must not be imported there).
- `lib/apiCallLog.ts` — `ApiCallSource` += `"sodex"`.
- `components/dashboard/ApiCallLog.tsx` — added green `sodex` source badge (ArrowLeftRight icon).
- `.env.example` — added SODEX_SIGNER_PRIVATE_KEY, SODEX_API_KEY_NAME, SODEX_ACCOUNT_ID, SODEX_ACCOUNT_ADDRESS, SODEX_NETWORK with guidance comments.

**Verification**
- `npx tsc --noEmit` → 0 errors; `npx eslint . --ext .ts,.tsx` → 0 warnings; `npx next build` → 14 routes (`/api/sodex` dynamic).
- Live runtime smoke test of `/api/sodex` quote: BTC sell → `"0.01234"`, SOL buy → `"620"`, USDC skipped (cash), AVAX $0.03 skipped (<$5), account null (no signer); execute w/o key → 503 clear message. All correct.

**TWO signing details unverifiable without a funded testnet account (flagged in-code):**
1. Decimal canonicalization must be byte-identical to the Go server's shopspring/decimal (we floor + trim trailing zeros). 
2. Signature `v` byte (we normalise viem's 27/28 → 0/1).
If signatures get rejected on first real submit, these two are the suspects. Validate against `SODEX_NETWORK=testnet` (chainId 138565) with a funded account before trusting mainnet fills.

### Testnet validation 2026-05-23 (in progress)

`SODEX_NETWORK=testnet` set in `.env.local`. All five index tokens (BTC/ETH/SOL/BNB/AVAX) have TRADING USDC markets on testnet under the same names (TESTBTC/TESTSHIB are separate extras). Account resolved: `SODEX_ACCOUNT_ADDRESS=0x60C0…5c62` → `aid 46684`, ready.

- Quote ETH/USDC buy $6 → tradable, funds "6", symbolId 2. Correct.
- First real `batchNewOrder` submit → engine `code:-1 error:"API key not found"`. Root cause: `SODEX_API_KEY_NAME=SODEX_API_KEY` is a placeholder, not a registered key name. Order BODY is correct: `{"accountID":46684,"orders":[{"symbolID":2,"clOrdID":...,"side":1,"type":2,"timeInForce":3,"funds":"6"}]}` (field order, enums, trimmed decimal, 0x01-prefixed 66-byte sig all good). Engine rejected at key lookup BEFORE signature verification, so the v-byte and decimal-canonicalization questions remain unconfirmed.
- Route fix shipped: `executePlan` now reads `res.text()`, extracts engine error from `error`/`msg`/`message`/`errMsg`, and returns the full envelope as `raw` (previously only `data`, which was null — error reason was being swallowed). Temp debug log removed. tsc/lint clean.
- Windows gotcha: Git Bash `kill` orphans the `next start` node tree; a stale env-less server on :3939 served the first (wrong) quote. Kill by port via `netstat -ano` + `taskkill //F //T`, or use a fresh port.

### SoDEX execution VALIDATED end-to-end on mainnet 2026-05-23

Testnet was abandoned (faucet/key friction); validated directly on mainnet with a small real order at Ludarep's direction. `SODEX_NETWORK=mainnet`, mainnet account `0x60C0…5c62` → `aid 205507`. The key name `SODEX_API_KEY` turned out to be Ludarep's actual registered key name (not a placeholder after all).

**Real order filled:** market SELL 0.0027 ETH/USDC. Engine returned `code:0`, `orderID:2019977531`, ACCEPTED. Balance moved 0.0041→0.0014 vETH and 0→5.5932 vUSDC — exact, confirming the fill. This validates the two previously-unconfirmed signing details: (1) decimal canonicalization (trimmed string `"0.0027"`) accepted; (2) `v`-byte normalization (viem 27/28 → 0/1, `0x01` prefix) accepted. The whole quote → EIP-712 sign → submit → confirm pipeline works with real funds.

**Confirmed success-response shape:** `{code:0, timestamp, data:[{code:0, clOrdID, orderID}]}`. No per-order `status` field on success; `RawOrderResult` mapping handles this (defaults status to ACCEPTED, extracts `orderID`). Works as-is; could narrow the type later but not required.

**NOTE:** `.env.local` is currently on `SODEX_NETWORK=mainnet` with a live key — any execute via the dashboard now places REAL orders. Switch back to `testnet` for safe demos.

### Next session / Wave 2 remaining

1. SoDEX execution is done and validated. Optional polish: narrow `RawOrderResult` to the confirmed shape; surface `orderID` in the dashboard result panel (already wired via `SodexOrderResult.orderId`); consider order-status polling via `GET /accounts/{addr}/orders` for fill confirmation in the UI.

### Wave 1 carry-over (still applies)

1. Real on-chain balance reads once ValueChain testnet chainId + token addresses land — replace simulated balances in `hooks/usePortfolio.ts`.
2. Persist rebalance activity to backend or IPFS for cross-device history (currently localStorage-only).
3. Auto-trigger based on `trigger` config (cron-like interval OR drift watcher) — currently manual only.
4. Tests: unit tests for `lib/rebalance.ts` (drift math, edge cases), integration for `/api/prices` proxy.

## Stack decisions

- Next.js 16 (not 14 — CLAUDE.md says latest stable wins; app router API identical)
- Wagmi pinned to v2 as user specified (`2.19.5`)
- RainbowKit instead of ConnectKit — ConnectKit never updated past React 18
- SoSoValue behind server-side proxy; CoinGecko fallback until API key lands

## Open decisions for Ludarep

- Design tokens (presented in chat)
- Is Next.js 16 acceptable, or re-pin to 14? (App-router code is identical)


## Plan (phased)

1. Scaffold Next.js 14 in current directory (already an empty git repo). Skip the typo `indexpiolt` — use folder as-is.
2. Install deps: shadcn/ui, wagmi v2, viem v2, @tanstack/react-query, recharts, connectkit. Pin exact versions.
3. `lib/types.ts` — Token, IndexConfig, RebalanceOrder, ActivityEvent, DriftStatus.
4. `lib/sosovalue.ts` — verified public endpoints, react-query-friendly fetchers.
5. `lib/rebalance.ts` — pure drift + order-generation functions, fully typed and tested.
6. `lib/storage.ts` — typed localStorage helpers with schema versioning.
7. `lib/sodex.ts` — empty typed slot. Function signatures, no impl.
8. Providers (wagmi + react-query) in `app/layout.tsx`.
9. `/setup` page with live 100% validation.
10. `/dashboard` with mock data first, wire real data after charts/tables look right.
11. `/` landing last.
12. Verify: `tsc --noEmit`, no console errors, mobile responsive check.

## Open questions for Ludarep

1. **SoSoValue API** — brief says `https://api.sosovalue.com` but this needs live verification. Public endpoints / auth model / rate limits must be confirmed before coding the fetcher. Proposal: I hit the docs or the host directly first to confirm shape, then build.
2. **Wallet connect** — ConnectKit vs wagmi built-in. ConnectKit is nicer UX but adds ~30kb. Recommend ConnectKit for landing polish, swap if bundle budget bites.
3. **ValueChain testnet chainId** — left as a config constant until confirmed. OK to proceed this way?
4. **shadcn/ui** — initialize with `new-york` style + neutral base color so we can overlay the dark near-black palette cleanly?

## Not in scope this wave

- SoDEX execution (pending API approval)
- On-chain tx signing for rebalance
- Multi-wallet / multi-chain
- Server-side persistence (Wave 1 is localStorage only)

## Completed 2026-05-26 — site-wide background + glass cards

Two 21st.dev components installed by fetching their registry JSON directly (no
`components.json` exists and there is no Tailwind config — the `shadcn add` CLI
would have triggered an interactive `init` that hangs in a non-interactive shell):

- **elegant-dark-pattern** (jatin-yadav05) — chosen as the base layer: dark radial
  wash + skewed cyan streaks + noise/dot texture. Fits the restrained dark aesthetic.
- **background-paths** (kokonutd) — chosen for the animated SVG path field overlay.

Files:
- `components/ui/elegant-dark-pattern.tsx` — `DarkGradientBg` (made the `className`
  prop functional via `cn`; it was dead in the source).
- `components/ui/background-paths.tsx` — `FloatingPaths` exported for reuse as a
  bare layer; Button import repointed to the project's `@/components/ui/Button`.
- `components/ui/SiteBackground.tsx` — composes `DarkGradientBg` base +
  `FloatingPaths` (x2) at `opacity-40`, `pointer-events-none`, behind content.
- `app/layout.tsx` — wraps the whole app in `<SiteBackground>`; added `dark` class
  to `<html>`.
- `app/globals.css` — `@custom-variant dark (&:where(.dark, .dark *))` to make
  dark mode class-based (the components rely on `dark:` variants; Tailwind v4
  defaults to prefers-color-scheme). Added `.card-glass` (rgba white bg + faint
  border + 8px backdrop blur, with `-webkit-` prefix).
- Glass applied to: `Card`, landing `HeroPanel`, `NetworkSwitcher` confirm modal,
  `ApiCallLog`, dashboard connect-wallet banner. Docs layout bg made transparent;
  docs sidebar switched to translucent blur (Header pattern) to avoid a seam.
  Nested contrast surfaces (AIBriefing inner boxes, TriggerSelector options) left
  solid to preserve hierarchy.
- Installed `framer-motion@12.40.0` (exact-pinned, age-gated via existing `.npmrc`).
- Verified: `tsc --noEmit` 0 errors, `next build` clean (13 routes).

## Lessons

(none yet — will populate `tasks/lessons.md` as we go)
