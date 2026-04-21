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

Wave 1 complete. Build passes, typecheck clean, lint clean. Awaiting manual UI pass.

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

## README

Written at `/README.md`. No AI or program attribution. Documents stack, env vars, scripts, architecture, price flow, rebalance logic, simulated-holdings rationale, and security posture.

## Next session / Wave 2 prep

1. Real on-chain balance reads once ValueChain testnet chainId + token addresses land — replace simulated balances in `hooks/usePortfolio.ts`.
2. Implement `lib/sodex.ts` factory once SoDEX API key lands; wire dashboard "Execute on SoDEX" to deeplink with plan.
3. Persist rebalance activity to backend or IPFS for cross-device history (currently localStorage-only).
4. Auto-trigger based on `trigger` config (cron-like interval OR drift watcher) — currently manual only.
5. Tests: unit tests for `lib/rebalance.ts` (drift math, edge cases), integration for `/api/prices` proxy.

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

## Lessons

(none yet — will populate `tasks/lessons.md` as we go)
