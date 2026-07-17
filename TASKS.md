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
- [x] Move the storage safety gate before the first task/GPT schema change and freeze v1/v2/v3 parsers
- [x] Define model-bound versus model-opaque subscription eligibility and conditional fallback rules
- [x] Define machine-readable quota availability, same-unit consumption, validation, and provenance
- [x] Define plan-level incremental cash, shared subscription fee, and total-cash budget rules
- [x] Close capability/upgrade signals and complete task, route, and plan tie-breaks
- [x] Separate persisted provenance claims from resolver-issued evidence authority
- [x] Define one canonical provider/Offering/resource identity across routes and exports
- [x] Align Cost Saver route and full-plan comparators with cash-first product wording
- [x] Define the conservative premium baseline and signed avoided/additional-spend formulas
- [x] Keep LocalStorage and result-export versioning independent without changing runtime v3 schemas
- [x] Keep the five provider-comparison P2 findings outside this implementation checkpoint
- [x] Reserve self-hosting, GPU, power, and local-inference calculation for Phase 2
- [x] Confirm that checkpoint 1 changes only `SPEC.md`, `TASKS.md`, and `DECISIONS.md`

Checkpoint 1 is complete when the three planning documents agree on the target product, current
API-only behavior remains labeled accurately, the incremental migration sequence and known
conflicts are explicit, the full regression suite still passes, and no runtime contract changes.

## Ver3 staged implementation — checkpoint 2 review candidate

### Checkpoint 2 — model and offering adapters

- [x] Add target `ModelDefinition`, discriminated `Offering`, resolved-price, and invocation-limit views beside current types
- [x] Resolve model-bound references and intersect model limits with narrower offering access limits
- [x] Distinguish complete/partial/unknown model limits and same/bounded/unknown access policies
- [x] Intersect model and access-path capability profiles; never inherit an unknown surface capability set
- [x] Gate model-opaque subscriptions on complete sourced eligibility profiles
- [x] Return closed eligible/conditional/ineligible results and require API fallback for conditional paths
- [x] Separate untrusted stored evidence inputs from resolver-only provider/connector evidence types
- [x] Resolve exact immutable catalog IDs, versions, entries, claims, subjects, and field paths from an allowlist
- [x] Keep preset and connector references conditional until their versioned allowlists/resolvers exist
- [x] Preserve immutable v1 and v2 registry snapshots behind exact catalog/version lookup
- [x] Pin the v1 canonical manifest digest and test v1/v2 simultaneous restore without silent upgrade
- [x] Add stable access-provider identity and one structured provider/Offering/resource route identity
- [x] Assign Custom providers to the exact `custom.` namespace and reject registered-ID impersonation
- [x] Reject duplicate route tuples and resource-to-Offering/provider reference mismatches
- [x] Adapt the current 3×3 provider catalog without deleting or changing its public meaning
- [x] Restrict legacy projection to canonical provider/tier lookup; never project caller-supplied resolved values
- [x] Keep the planner-authored quality-tier heuristic outside provider-published identity claims
- [x] Preserve current provider-plan outputs with API-offering parity tests
- [x] Keep the closed current API `ProviderId` separate from extensible `AccessProviderId`
- [x] Test missing model references, sourced/observed/unprofiled opaque offerings, capability subsets, surfaces, and limits
- [x] Test same-as-model versus unknown, tighter limit/capability intersections, and partial/user-observed conditional results
- [x] Test forged official kinds/URLs, Custom metadata, unknown registry versions, claim mismatches, and user override non-escalation
- [x] Test model-opaque provider ordering and API `resourceId: null` canonical route keys
- [x] Keep the documented and runtime conditional reason-code arrays identical and ordered

Checkpoint 2 is intentionally passive: the adapter does not replace the current allocator, UI,
LocalStorage, or exports. Current catalog capabilities remain `unknown` until a versioned official
claim is added, and model-limit evidence is not reused as access-policy evidence. These adapted API
offerings therefore are not silently promoted to confirmed Best-fit routes.

### Checkpoint 3 — workload requirement contract

- [x] Before changing live task or GPT schemas, define immutable storage parsers and golden fixtures for v1/v2/v3
- [x] Remove historical parser dependencies on mutable task, analysis, response, enum, and length-limit schemas
- [x] Introduce LocalStorage v4 atomically with the versioned GPT/task contract
- [x] Require every later persisted source-shape change to introduce its storage version in the same checkpoint
- [x] Implement the sequential v1 → v2 → v3 → v4 adapter chain
- [x] Preserve v3 responses as `legacy-api-only` snapshots with no fabricated GPT-derived fields
- [x] Keep legacy API-only planning available and require explicit reanalysis before Best-fit allocation
- [x] Preserve valid legacy bytes when adaptation, target validation, or rewrite fails
- [x] Version the GPT contract for work mode, minimum quality, capabilities, and upgrade conditions
- [x] Add optional date-only task deadline, bounded user failure impact, and bounded GPT `failureRisk`
- [x] Initialize new failure impact visibly to Medium and migrate legacy impact to `unspecified`
- [x] Replace allocation-driving free strings with versioned `CapabilityId` and upgrade code enums
- [x] Update prompt, Zod validation, Mock fixtures, and identity checks together
- [x] Enforce the documented work-mode to supported-surface compatibility crosswalk
- [x] Prevent Cost Saver or another strategy from crossing a hard minimum quality floor
- [x] Keep price, quota, provider, and final-route decisions out of GPT output
- [x] Scope current Active/fit UI and exports to price, v2 minimum quality, invocation limits, and budget; disclose that work-mode/capability eligibility is still unknown
- [x] Keep legacy infeasible explanations invocation-only in UI, Markdown, and unchanged JSON v3 semantics
- [x] Test v3 byte preservation, legacy API parity, no automatic analysis, adapter/write failures, future versions, and new round-trip

### Checkpoint 4 — generalized API offering calculation

- [ ] Resolve time- and condition-aware API prices before deterministic estimation
- [ ] Add labeled user overrides for verified catalog price/tier defaults with one-step restore
- [ ] Reuse size bands, iterations, feasibility, and micro-USD arithmetic for API offerings
- [ ] Preserve standard-price assumptions and expose excluded billing conditions
- [ ] Reject an executable route when its price schedule or token-range conditions do not apply
- [ ] Keep the reviewed API-only comparison available as a compatibility view

### Checkpoint 5 — subscription resource engine

- [ ] Add owned/new subscription input with provider, fee, remaining quota, reset, surfaces, and overage
- [ ] Require ownership-aligned commitment amount, USD basis, plan period, and evidence
- [ ] Implement available/unavailable/uncertain state and pure same-unit Low/Expected/High demand estimation
- [ ] Support metered, user-calibrated, and opaque quota without fake precision
- [ ] Validate finite bounds, range ordering, sample size, units, dates, evidence, reset, and overage
- [ ] Require sourced included capacity plus timestamped user/connector remaining-capacity snapshots
- [ ] Model candidate-new initial capacity separately from owned remaining snapshots
- [ ] Treat reset as metadata only; never auto-replenish and downgrade post-reset stale snapshots to uncertain
- [ ] Resolve paid overage by Offering scope, effective dates, same unit, deficit, and optional cap
- [ ] Reject opaque-quota paid overage and unknown/expired/out-of-scope overage as confirmed capacity
- [ ] Keep observed/calibrated/opaque paths conditional and require a compatible budgeted API fallback
- [ ] Resolve connector references only through registered adapters with authenticated account/resource binding and replay checks
- [ ] Downgrade unresolved registry/connector evidence to conditional without deleting its source state
- [ ] Emit closed conditional and fallback-failure reason codes in a fixed versioned order
- [ ] Reserve only a derived ledger; never mutate saved remaining quota during planning
- [ ] Count a new subscription commitment once and existing included use as `$0` incremental cash
- [ ] Keep subscription consumption and API spend in separate ledgers
- [ ] Reject surface-incompatible routes and provide an API fallback for uncertain capacity
- [ ] Add honest ChatGPT-like, GitHub Copilot-like, GLM-like, and Custom subscription presets
- [ ] Test exact quota boundaries, 0/100 percent, NaN/Infinity, unit mismatch, duplicate reservation, and fallback failure
- [ ] Test valid/oversized/missing initial capacity and ensure activation depletes only a derived ledger
- [ ] Prove conditional-only routes cannot set active/all-active; fallback budget failure holds and missing fallback is infeasible
- [ ] Test forged/offline/cross-account/stale/replayed connector snapshots and authenticated refresh behavior
- [ ] Test two resources for one Offering select the same canonical resource regardless of input order

### Checkpoint 6 — deterministic Best-fit allocation

- [ ] Evaluate compatible offerings above the minimum quality floor
- [ ] Migrate `budgetUsd` through an atomic storage-version adapter without silently changing its API-only meaning
- [ ] Require explicit user confirmation before an imported legacy budget becomes `incrementalCashBudgetUsd`
- [ ] Calculate scenario cash as API + distinct active new-subscription fees + paid overage
- [ ] Deduplicate shared fees, omit unused/fallback-only fees, and remove a fee after its last active assignment
- [ ] Test two $6 API tasks versus one $10 shared subscription and the one-task $6 versus $10 boundary
- [ ] Test fixed fees in Expected fit and High warning plus source-backed paid-overage boundaries
- [ ] Compare complete plans for each add-one subscription activation before choosing a route set
- [ ] Select routes with complete strategy comparators ending in the canonical provider/Offering/resource tuple
- [ ] Implement exact tier/status/budget/route ranks and lexicographic `qualityKey` vector semantics
- [ ] Apply the documented Cost Saver, Balanced, and Quality First secondary policies
- [ ] Emit the Premium compatibility-fallback trigger when no compatible sub-Premium Offering remains
- [ ] Preserve quota according to the documented priority/deadline/impact/risk task order
- [ ] Test priority → deadline → impact → risk → stable-index reservation and inverse relief boundaries
- [ ] Test all failure impact/risk triggers, unknown enum rejection, and free-form risk exclusion
- [ ] Test route and full-plan comparator ties for every strategy and input/object enumeration order
- [ ] Test directional `qualityKey`: exact target first, equal-distance above beats below, then smallest excess
- [ ] Apply `qualityKey` in Cost Saver only after equal Expected variable cash
- [ ] Test Cost Saver cash-first boundaries: `$0` owned Balanced beats `$1` Economy API, while equal cash prefers Economy
- [ ] Prove untriggered Premium is excluded and triggered Premium participates in the cash comparator
- [ ] Test Cost Saver full-plan cash before quality after the common budget-fit/status prefix
- [ ] Test conditional candidate/reason/fallback ordering and exports are invariant to insertion order
- [ ] Test cheaper API versus owned paid overage and route reassignment before any hold
- [ ] Hold lower-priority work when compatible quota and incremental-cash budget are unavailable
- [ ] Generate route rationale, premium non-selection, upgrade trigger, alternative, and hold reason by rule
- [ ] Resolve the cheapest compatible Premium API per active task at the same `pricingAsOf`
- [ ] Calculate selected incremental cash, avoided spend, and additional spend with integer micro-USD
- [ ] Test missing baseline → null, held/infeasible exclusion, fallback cash, and fee/overage deduction once

### Checkpoint 7 — resource input and route-result UI

- [ ] Add Available AI resources while evolving the current budget flow through a versioned contract
- [ ] Integrate the existing task-level deadline input into resource planning without repurposing the global reference deadline
- [ ] Integrate bounded failure impact into resource planning and label the budget as total incremental cash
- [ ] Expose only the limited verified-catalog override controls and default restoration
- [ ] Show API spend, subscription usage, new subscription commitment, and paid overage separately
- [ ] Lead task results with the selected access route rather than only a model name
- [ ] Keep Korean, English, and Japanese presentation consistent and responsive
- [ ] Avoid self-hosting or objective model-ranking claims in hero and help copy
- [ ] Apply the approved Best-fit hero message and an explicit Korean-capable font

### Checkpoint 8 — persistence, export, and release candidate

- [ ] Verify that resource/override source versions extended the checkpoint-3 chain when their shapes changed
- [ ] Preserve the versioned legacy analysis snapshot while adding default API-only resource state
- [ ] Persist and export user overrides without overwriting the official default/source snapshot
- [ ] Preserve source-only persistence and recalculate all derived routes on restore
- [ ] Persist only evidence references and user observations; re-resolve authority on every restore
- [ ] Treat exported resolved evidence as audit-only and never as import or restore authority
- [ ] Preserve historical JSON v3 and workload JSON v4; introduce the next result version for route/resource meaning and update Markdown in parallel
- [ ] Export route, API cash, subscription use, confidence, alternative, premium baseline, and sources
- [ ] Export structured route identities for tasks, fallbacks, activated resources, and Premium baselines
- [ ] Export paid overage, `planningAsOf`, `pricingAsOf`, and signed cash difference
- [ ] Export commitment, capacity snapshot, reset, overage applicability, and evidence metadata
- [ ] Test task/plan/Markdown/JSON route-key parity and ensure audit snapshots cannot escalate restored authority
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
