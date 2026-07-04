# IndexPilot lessons

## Gitignore ate .env.example (found 2026-07-03)

The scaffolded `.gitignore` contained a bare `.env*` pattern, so `.env.example` was silently untracked and lost when the repo moved to a fresh machine. Rule: whenever a repo ignores `.env*`, immediately add `!.env.example` and verify with `git ls-files | grep env` that the example file is actually tracked.

## Server-only modules cannot export runtime values to the client (2026-07-03)

`lib/sosovalue-signals.ts` is `import "server-only"`; type-only imports from it are safe in client code (erased at compile time), but runtime constants like `URGENCY_RANK` are not. Pattern: keep shared types plus any client-needed constants in a separate client-safe module (`lib/signalTypes.ts`, mirroring the existing `sodex.ts` / `sodexTypes.ts` split) and re-export from the server module.

## Verify endpoint existence before building on it (2026-07-03)

SoSoValue v2 ETF endpoints and the SoDEX orders endpoint were probed live with curl before any code was written. A 401 with a structured envelope proves the route exists and is key-gated; a 200 with an empty list proves shape but not the populated record. Anything unverifiable gets a tolerant parser, a preserved `raw` field, and an explicit in-code note about what still needs live validation.
