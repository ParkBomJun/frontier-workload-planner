# Task board

## Checkpoint 1 — minimum vertical slice

- [x] Initialize Next.js with TypeScript, App Router, Tailwind, `src/`, ESLint, and npm lockfile
- [x] Define the product boundary and replace “optimal allocation” with “budget-aware recommended plan”
- [x] Define bounded request and Structured Output Zod schemas
- [x] Implement server-only Mock/Live `POST /api/analyze`
- [x] Use Responses API with `gpt-5.6`, low reasoning, output cap, and one retry maximum
- [x] Implement one-task UI, sample loading, mode selection, and all basic request states
- [x] Add README, SPEC, decision log, environment example, and MIT license
- [x] Pass unit tests, lint, TypeScript, and production build
- [x] Verify Mock success, invalid input, disabled-Live failure, and mobile width
- [x] Create the P0 checkpoint commit after local verification

## Checkpoint 2 — core MVP

- [x] Add and remove up to eight tasks with stable task IDs
- [x] Add budget, reference deadline, and strategy inputs
- [x] Add official Luna / Terra / Sol standard-price configuration and source date
- [x] Convert GPT size bands through fixed per-iteration token ranges
- [x] Calculate deterministic Low / Expected / High token totals and costs
- [x] Compare and sum costs with integer micro-USD boundaries
- [x] Allocate model tiers against Expected cost with explainable downgrade rules
- [x] Warn when all-Economy Expected cost or allocated High cost exceeds budget
- [x] Render result summaries, task details, assumptions, and one Expected-cost chart
- [x] Test pricing order, size bands, scenarios, strategies, budget boundaries, ID validation, tie-breaking, and deadline independence
- [x] Pass full unit tests, lint, TypeScript, production build, API checks, and mobile-width smoke check
- [x] Create the checkpoint 2 review commit

## Checkpoint 3 — release candidate

- [x] Save and restore one versioned recent successful scenario in LocalStorage
- [x] Revalidate stored task/analysis identities and recalculate with current pricing on restore
- [x] Keep restore non-blocking and prevent any automatic Live request
- [x] Add explicit recent-record deletion and plaintext-storage disclosure
- [x] Add Markdown clipboard copy with escaped task content and feedback states
- [x] Add versioned JSON export with task descriptions, current plan, and pricing snapshot
- [x] Move example tasks into the dedicated data module
- [x] Add visible empty and loading result states plus invalid-field focus
- [x] Raise result-label contrast and keep new controls at least 44px high
- [x] Add storage and export unit tests
- [x] Update README, specification, and decision log for the release candidate
- [x] Pass full unit tests, lint, TypeScript, production/API, browser, and secret checks
- [x] Create the checkpoint 3 review commit

## Checkpoint 4 — release operations

- [x] Reconfirm the official GPT-5.6 alias and standard Luna / Terra / Sol pricing
- [x] Pin the documented Node.js runtime floor in package metadata
- [x] Remove internal checkpoint wording from the public UI
- [x] Prepare a local Devpost title, problem, and solution draft
- [x] Document that public production must keep unauthenticated Live analysis disabled
- [x] Pass the release-preparation test, lint, TypeScript, build, API, browser, and secret checks
- [x] Create the checkpoint 4 local release-preparation commit
- [ ] Complete one real GPT-5.6 Structured Output call with the user's server-side key
- [ ] Publish the GitHub repository
- [ ] Configure Vercel environment variables and deploy
- [ ] Copy the local draft into Devpost and add the GitHub and deployment URLs

## Explicitly deferred

- User-defined arbitrary models
- Multiple scenario management
- CSV export
- Second graph
- Detailed duration prediction
- Exhaustive or complex optimization
- Pricing override UI
