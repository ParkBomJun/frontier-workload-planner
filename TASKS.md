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
- [x] Warn when the lowest compatible Expected cost or allocated High cost exceeds budget
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

## Final pre-release scope alignment

- [x] Add High / Medium / Low user priority with Medium defaults
- [x] Use user priority as the first deterministic budget-relief criterion
- [x] Hold lower-priority work when active Economy Expected cost still exceeds budget
- [x] Exclude held work from assigned models, execution costs, totals, and High warnings
- [x] Reconsider held work locally when budget, strategy, or priority changes
- [x] Migrate recent scenarios from schema v1 to v2 without persisting derived allocation state
- [x] Include priority and active/held state in Markdown and version 2 JSON exports
- [x] Extend allocation, schema, storage, and export regression tests

## Post-review hardening

- [x] Enforce the 96 KiB request limit while streaming instead of after full buffering
- [x] Contain request-stream failures in the existing sanitized JSON error contract
- [x] Apply GPT-5.6 cache-write pricing conservatively to eligible modeled inputs
- [x] Expose cache-write assumptions in the UI, Markdown, JSON, and specification
- [x] Disclose automatic plaintext LocalStorage persistence before first submission
- [x] Hide stale export feedback after plan changes, including delayed clipboard completion
- [x] Complete one real GPT-5.6 Structured Output call with the user's server-side key
- [x] Publish the GitHub repository
- [x] Configure Vercel environment variables and deploy
- [x] Verify the public page, Mock `200`, disabled-Live `403`, and 390px production flow
- [x] Add the GitHub and deployment URLs to the local Devpost draft
- [ ] Copy the local draft into the Devpost project

## Provider comparison feature branch

- [x] Create `feature/provider-comparison` without modifying stable `main` or production
- [x] Verify the six Anthropic and Google model prices and conditions against official sources on 2026-07-17
- [x] Define GPT-5.6 as the only analyzer and prohibit Claude/Gemini API calls
- [x] Document tier mapping as a budget heuristic with no quality ranking or “best model” claim
- [x] Define standard uncached text pricing and exclusions for cache, Batch, tools, and long-context surcharges
- [x] Add the OpenAI, Anthropic, and Google catalog with official source URLs and verification date
- [x] Preserve Sonnet 5's 2026-08-31 introductory-price expiry
- [x] Record Flash-Lite as Stable, the other selected Gemini models as Preview, and disclose the Gemini 3.1 Pro ≤200K price condition
- [x] Record provider-native input/output/combined invocation limits with official source and verification date
- [x] Validate each Low / Expected / High invocation without truncation or automatic splitting
- [x] Exclude incompatible tiers, reassign compatible work, and separate `infeasible` from budget holds
- [x] Preserve invocation-limit failures in UI, Markdown, and JSON
- [x] Calculate independent Low / Expected / High allocation plans and comparison summaries for all providers
- [x] Select a product family and swap plans locally without an analysis API request
- [x] Migrate LocalStorage v1/v2 to v3 with OpenAI selected by default
- [x] Add provider state and comparison/catalog snapshots to Markdown and JSON v3 exports
- [x] Add catalog, provider-boundary, allocation, migration, and export regression tests
- [x] Add Korean, English, and Japanese interface selection without an analysis API request
- [x] Localize UI status, validation, accessibility copy, warnings, samples, and human-readable Markdown
- [x] Persist locale independently and keep JSON v3 locale-neutral
- [x] Verify lint, TypeScript, all tests, production build, API behavior, and mobile layout
- [x] Create one atomic feature commit and request review before any merge or deployment

## Ver3 checkpoint 1 — product and transition contract

- [x] Freeze the P0/P1-approved API-only baseline at `provider-comparison-stable` (`d3edd98`)
- [x] Continue on the isolated `feature/best-fit-offerings` branch
- [x] Define minimum-sufficient planning quality instead of model-tier maximization
- [x] Keep GPT-5.6 as the only analyzer and prohibit Anthropic or Google API calls
- [x] Separate API cash, subscription quota, new subscription commitment, and opportunity cost
- [x] Define honest credits, requests, user-calibrated, and opaque quota behavior
- [x] Define `ModelDefinition` and `Offering` as future concepts without changing runtime types
- [x] Inventory reusable catalog, feasibility, estimation, allocation, storage, and export seams
- [x] Preserve `frontier` and `recommendedModelTier` until explicit versioned adapters exist
- [x] Define deterministic Best-fit filtering, selection, fallback, explanation, and hold rules
- [x] Define the source-state and result-export migration boundary without changing v3 schemas
- [x] Keep the five provider-comparison P2 findings outside this implementation checkpoint
- [x] Reserve self-hosting, GPU, power, and local-inference calculation for Phase 2
- [x] Confirm that checkpoint 1 changes only `SPEC.md`, `TASKS.md`, and `DECISIONS.md`

Checkpoint 1 is complete when the three planning documents agree on the target product, current
API-only behavior remains labeled accurately, the incremental migration sequence and known
conflicts are explicit, the full regression suite still passes, and no runtime contract changes.

## Ver3 staged implementation — not started

### Checkpoint 2 — model and offering adapters

- [ ] Add target `ModelDefinition`, API `Offering`, resolved-price, and invocation-limit views beside current types
- [ ] Adapt the current 3×3 provider catalog without deleting or changing its public meaning
- [ ] Preserve current provider-plan outputs with API-offering parity tests
- [ ] Keep API provider IDs separate from extensible subscription provider identity

### Checkpoint 3 — workload requirement contract

- [ ] Version the GPT contract for work mode, minimum quality, capabilities, and upgrade conditions
- [ ] Add an optional user-owned task deadline and bounded GPT `failureRisk` signal
- [ ] Update prompt, Zod validation, Mock fixtures, and identity checks together
- [ ] Enforce the documented work-mode to supported-surface compatibility crosswalk
- [ ] Prevent Cost Saver or another strategy from crossing a hard minimum quality floor
- [ ] Keep price, quota, provider, and final-route decisions out of GPT output

### Checkpoint 4 — generalized API offering calculation

- [ ] Resolve time- and condition-aware API prices before deterministic estimation
- [ ] Add labeled user overrides for verified catalog price/tier defaults with one-step restore
- [ ] Reuse size bands, iterations, feasibility, and micro-USD arithmetic for API offerings
- [ ] Preserve standard-price assumptions and expose excluded billing conditions
- [ ] Reject an executable route when its price schedule or token-range conditions do not apply
- [ ] Keep the reviewed API-only comparison available as a compatibility view

### Checkpoint 5 — subscription resource engine

- [ ] Add owned/new subscription input with provider, fee, remaining quota, reset, surfaces, and overage
- [ ] Support credits, requests, user-calibrated percentage, and opaque quota without fake precision
- [ ] Count a new subscription commitment once and existing included use as `$0` incremental cash
- [ ] Keep subscription consumption and API spend in separate ledgers
- [ ] Reject surface-incompatible routes and provide an API fallback for uncertain capacity
- [ ] Add honest ChatGPT-like, GitHub Copilot-like, GLM-like, and Custom subscription presets

### Checkpoint 6 — deterministic Best-fit allocation

- [ ] Evaluate compatible offerings above the minimum quality floor
- [ ] Select the minimum-sufficient, least incremental-cash route with deterministic tie-breaks
- [ ] Apply the documented Cost Saver, Balanced, and Quality First secondary policies
- [ ] Preserve quota for higher-priority and higher-loss work
- [ ] Test priority → task deadline → failure risk → stable-order reservation and inverse relief boundaries
- [ ] Hold lower-priority work when compatible quota and API budget are unavailable
- [ ] Generate route rationale, premium non-selection, upgrade trigger, alternative, and hold reason by rule
- [ ] Calculate avoided spend only for executed work against a disclosed compatible premium baseline

### Checkpoint 7 — resource input and route-result UI

- [ ] Add Available AI resources without removing the current task and API-budget flow
- [ ] Add the optional task-level deadline input without repurposing the global reference deadline
- [ ] Expose only the limited verified-catalog override controls and default restoration
- [ ] Show API spend, subscription usage, and new subscription commitment separately
- [ ] Lead task results with the selected access route rather than only a model name
- [ ] Keep Korean, English, and Japanese presentation consistent and responsive
- [ ] Avoid self-hosting or objective model-ranking claims in hero and help copy
- [ ] Apply the approved Best-fit hero message and an explicit Korean-capable font

### Checkpoint 8 — persistence, export, and release candidate

- [ ] Migrate LocalStorage v3 source state to a new version with default API-only resources
- [ ] Persist and export user overrides without overwriting the official default/source snapshot
- [ ] Preserve source-only persistence and recalculate all derived routes on restore
- [ ] Version JSON instead of changing v3 meaning; update localized Markdown in parallel
- [ ] Export route, API cash, subscription use, confidence, alternative, premium baseline, and sources
- [ ] Verify deterministic allocation, quota accounting, migration, export, accessibility, mobile, and full build
- [ ] Demonstrate chat subscription, coding route, batch API, selective premium, held work, and avoided spend
- [ ] Align README, SPEC, DECISIONS, Devpost, and video copy with the implemented product boundary

## Provider-comparison P2 backlog — frozen during Ver3 checkpoint 1

- [ ] Resolve Sonnet 5 pricing by effective date and expose `pricingAsOf`
- [ ] Add the independent 922,000-token OpenAI input limit and boundary tests
- [ ] Improve 320px provider-card header and cost-row readability
- [ ] Add card-specific comparison summaries to provider radio descriptions
- [ ] Clear or bind Markdown copy feedback when the interface locale changes

## Explicitly deferred

- Arbitrary API providers or custom model catalog entries; `Custom subscription` metadata remains planned
- Direct Claude or Gemini API analysis
- Cross-provider quality benchmarks or automatic “best model” selection
- Multiple scenario management
- CSV export
- Second graph
- Detailed duration prediction
- Exhaustive or complex optimization
- Unbounded pricing editor; Ver3's limited verified-catalog override is staged separately
- Self-hosted inference, GPU sizing, electricity, throughput, and hardware-cost calculation (Phase 2)
