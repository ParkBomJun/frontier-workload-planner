# Decision log

## 2026-07-17 — P0 implementation of the first-day scope

The P0 scope was originally planned for 2026-07-15. This log uses the actual implementation date from the workspace.

### Product language

Use **Budget-aware recommended plan**. Do not present the rule-based allocation as mathematical optimization.

### GPT / program boundary

GPT classifies task type, complexity, reasoning depth, expected iteration count, size bands, uncertainty, risks, and a model tier. It never supplies token numbers or cost. A later deterministic engine owns every numeric conversion and budget rule.

### Stable model contract

The server default is the official `gpt-5.6` alias, while `OPENAI_ANALYSIS_MODEL` allows an account-compatible override without code changes. GPT returns only `economy`, `balanced`, or `frontier`; concrete Sol/Terra/Luna mapping remains program data.

### Responses API and Structured Outputs

Use `responses.parse` with the OpenAI SDK Zod helper, then validate again with the same Zod schema. Check task count, ordering, and IDs beyond schema validity.

### Mock first, Live explicit

Mock is the UI default. Live executes only on explicit form submission and only when `ENABLE_LIVE_ANALYSIS=true`. A failed Live request is shown as an error rather than silently replaced by Mock.

### Privacy and secret handling

Keep the API key in server environment variables, set `store:false`, avoid raw provider error bodies in logs and responses, and commit only an empty `.env.example`.

### Bounded failure behavior

Limit tasks, field lengths, request bytes, output tokens, and request duration. Disable SDK retries and perform at most two application attempts so schema and transient failures receive no more than one automatic retry.

### Scope discipline

Do not create placeholder folders for calculation, charts, storage, or export. Add those modules only when their corresponding feature begins.

### Dependency audit

Keep the current stable Next.js 16.2.10 dependency. On 2026-07-17, `npm audit --omit=dev` reported two moderate PostCSS advisories through Next.js and offered only a breaking forced downgrade to Next.js 9. The P0 app does not accept or stringify user-supplied CSS, and no high or critical advisory was reported, so a forced dependency rewrite is not justified for this checkpoint. Recheck when a patched stable Next.js release is available.

## 2026-07-17 — checkpoint 2 calculation and allocation

### Published standard pricing

Map Economy to Luna at $1 input / $6 output, Balanced to Terra at $2.50 / $15, and Frontier to Sol at $5 / $30 per million tokens. Keep the source URL and last-checked date beside the configuration. Do not apply cached-input discounts because the planner cannot promise cache hits.

### Per-iteration size contract

GPT classifies input and output sizes for one billable model call. Input includes all request context; output includes reasoning and visible output. The deterministic engine multiplies those fixed band values by scenario iterations and returns scenario-total tokens. This prevents GPT from inventing numbers and avoids multiplying an already-total estimate twice.

### High is risk headroom, not a schema cap

Low uses one fewer iteration with a floor of one, Expected uses the model's 1–5 classification, and High uses one more. An Expected value of five therefore produces six High iterations; five limits the expected classification, not the possible execution count.

### Exact currency boundaries

Round each calculated task scenario to integer micro-USD and use integer sums for allocation and warnings. This avoids an unnecessary downgrade when decimal floating-point addition lands just above an exact budget.

### Explainable strategy and downgrade rules

Cost Saver shifts the GPT recommendation down one tier, Balanced keeps it, and Quality First shifts it up one tier, all with endpoint clamping. When Expected is over budget, lower tasks by recommended tier, reasoning depth, complexity, uncertainty, and finally earlier input order. Re-evaluate after every one-tier change, so a lower-need task can be reduced twice before a higher-need task. This is a deterministic recommendation, not a global optimum.

### Time and uncertainty limits

The 1–90 day deadline is reference-only and cannot change cost or tier. Uncertainty protects work from earlier downgrades but does not numerically widen Low or High. Both limitations must remain visible in the assumptions.

### Checkpoint boundary

Checkpoint 2 owns multi-task editing, settings, costs, allocation, results, one chart, and core tests. Persistence and export remain checkpoint 3 work; do not mix them into this review unit.

## 2026-07-17 — checkpoint 3 release candidate

### Store source data, recalculate derived plans

Keep exactly one recent successful scenario in a fixed LocalStorage key. Store version, save time, submitted tasks, valid settings, and the sanitized analysis response. Do not store `BudgetAllocationPlan`; validate identity relationships and run the current deterministic engine again on restore so price or rule changes are not hidden by stale derived data.

### Restore never means rerun

Local restore happens only after client hydration and never calls the analysis route. A saved Live response may be displayed again, but it cannot trigger a new paid request. Recalculate settings changes locally and update the recent source record only while settings remain valid.

### Fail closed without blocking the planner

Discard malformed or damaged current-version data, preserve an unknown future version, and contain all browser storage access and quota exceptions. Recompute the next generated task ID after restore. These checks prevent a corrupted record or duplicate ID from throwing inside the render-time allocator.

### Plaintext storage needs user control

State that task descriptions remain as plaintext in the current browser origin and provide an explicit delete action. Treat deletion as persistence opt-out until another analysis succeeds, so a settings-only edit cannot silently recreate the record. Never store an API key, hidden prompt, raw provider error, or deployment configuration.

### Export an allowlisted projection

Markdown and JSON are built from the submitted task snapshot plus the currently displayed recalculated plan. Include original descriptions, analysis provenance, settings, costs, allocations, warnings, and the price snapshot. JSON is versioned; Markdown escapes user delimiters. Do not spread the page state into either output.

### Release-state accessibility

Keep a short live message for copy results, an inline storage status, and separate visible idle and loading panels. Move focus to the first invalid field after submit, keep export and storage actions at least 44px high, and raise low-contrast labels on dark result cards.

### Scope close

Price override UI remains deferred. The configuration file, official source, and visible update date satisfy this release candidate without adding another settings subsystem.

## 2026-07-17 — checkpoint 4 release operations

### Keep public Live analysis off

The MVP route has bounded inputs and retries but no user authentication, rate limit, or per-user quota. Validate one real GPT-5.6 request only from a local environment or protected preview, then keep `ENABLE_LIVE_ANALYSIS=false` in public production. Mock remains the safe public demo path; adding an authentication subsystem would expand the agreed MVP.

### Verify release facts without changing the engine

Rechecked the official GPT-5.6 guide and standard pricing on 2026-07-17. The `gpt-5.6` alias still routes to Sol, and the configured Luna, Terra, and Sol prices remain current. No price or calculation change is required.

### Separate local readiness from external publication

Pin Node.js `>=20.9.0`, remove internal checkpoint wording from the public UI, and keep the Devpost copy in a local draft. A real API call, GitHub publication, Vercel deployment, and Devpost account update remain incomplete until their respective user-owned credentials and target accounts are available. Do not treat local readiness as a successful deployment.

## 2026-07-17 — final priority and held-work alignment

### Priority belongs to the program, not GPT

Every source task has a user-owned `high`, `medium`, or `low` priority, with Medium as the default for new and migrated work. The API validates it with the source record, but the provider prompt explicitly projects only task ID, name, and description. Priority therefore cannot influence GPT's workload classification and remains an explainable allocation input.

### Use one deterministic relief order

Put user priority first in the existing downgrade comparator, followed by recommended tier, reasoning, complexity, uncertainty, and input order. If every active task is already Economy and still exceeds Expected budget, hold the first task in that same order. Restart remaining active tasks from their strategy targets after each hold so higher-priority work is not unnecessarily stranded at Economy. This remains a simple rule-based recommendation rather than a knapsack search or mathematical optimum.

### Held means no allocation

Represent planned work as an active/held discriminated union. Held tasks keep their analysis and Economy Expected minimum for explanation, but have null tier, model, and cost. All plan totals, utilization, High warnings, and chart costs include active tasks only. Re-running the pure allocator from source tasks means a larger budget can reactivate work without another GPT request.

### Version source state separately from exported results

Raise recent LocalStorage records to schema version 2 and explicitly migrate valid v1 tasks to Medium priority. Do not store held status or another derived plan. Raise JSON results to schema version 2, where priority and active/held allocation are intentional snapshot fields. A damaged v2 is rejected rather than silently defaulted, while an unknown future version remains untouched.

## 2026-07-17 — post-review hardening

### Count the actual request stream

Treat `Content-Length` only as a fast rejection hint. Read the Web request stream in bounded chunks, retain at most 96 KiB, and cancel immediately when accumulated bytes exceed the limit. Stream failures converge on the sanitized `INVALID_JSON` response instead of leaking transport errors or allowing an unbounded `request.text()` allocation.

### Price eligible GPT-5.6 input conservatively (stable main contract)

The official Prompt Caching contract enables caching for requests with at least 1,024 input tokens and bills GPT-5.6 cache writes at 1.25× standard input. Apply the cache-write rate to all modeled input when a scenario's per-iteration input reaches that threshold. Continue to exclude cached-read discounts because the planner cannot guarantee an exact prefix hit. This intentionally raises some estimates and can change downgrade or held decisions; it is a correctness change, not a fourth optimization mode. This remains the historical stable-`main` contract and is superseded inside `feature/provider-comparison` by the common standard-uncached-text comparison basis recorded below.

### Disclose persistence before it occurs

Keep the agreed automatic single-scenario save, but state before submission that task names and descriptions will be stored as plaintext LocalStorage. The existing post-result notice remains responsible for success, failure, restore, and deletion feedback.

### Bind export feedback to its plan

Tag copy/download feedback with the exact plan reference and analysis timestamp that initiated it. Show the message only while that context remains current, so settings or priority changes hide stale success text and a delayed clipboard promise cannot claim success for a newer plan.

## 2026-07-17 — external release validation

### Validate Live locally, keep production Mock-only

The server-side `gpt-5.6` alias returned `gpt-5.6-sol` in one real Structured Output request, and the response passed the application schema and task-identity checks. Disable local Live again after that single validation. Do not place the OpenAI API key in Vercel while the public route has no authentication or per-user rate limit.

### Publish one stable release surface

Publish the clean `main` history at <https://github.com/ParkBomJun/frontier-workload-planner> and deploy the Mock-capable production build at <https://frontier-workload-planner.vercel.app>. Configure production with `ENABLE_LIVE_ANALYSIS=false` and `OPENAI_ANALYSIS_MODEL=gpt-5.6`; a public Live request must return `403 LIVE_ANALYSIS_DISABLED`.

### Treat Git-based continuous deployment as separate plumbing

The first production deployment uses the authenticated Vercel CLI. Vercel could not attach the GitHub repository until the account receives a GitHub Login Connection, but that does not block the current public deployment. Add the connection later for automatic deploys without changing the application or exposing the API key.

## 2026-07-17 — limited provider-comparison feature branch

### Keep GPT-5.6 as the only analysis engine

Use one Mock fixture or one server-side GPT-5.6 Responses API request to classify all tasks. Reuse
the returned size bands, iterations, uncertainty, risks, and recommended tier unchanged for every
provider plan. Do not call Anthropic or Google APIs, and do not imply that their models analyzed or
validated the work.

### Treat tier alignment as a budget heuristic

Map `economy`, `balanced`, and `frontier` to one model in each provider catalog so the existing
deterministic allocation can compare planning costs. This mapping is not a benchmark, a claim of
capability equivalence, a quality ranking, or a “best model” recommendation. Keep this caveat in the
UI, exports, specification, README, and submission copy.

### Use one auditable standard-price basis

For cross-provider comparability, use only standard uncached text input/output prices. Exclude cache
writes and reads, cache discounts, Batch/Flex/Priority processing, tool and grounding fees, and
long-context surcharges. This feature-branch rule supersedes stable main's conservative GPT-5.6
cache-write assumption. It is a planning normalization, not a prediction of actual billing.

### Preserve catalog conditions and provenance

Keep all catalog values, official pricing and model URLs, and `verifiedAt: 2026-07-17` in program
data. Record Claude Sonnet 5's `$2 / $10` introductory price through 2026-08-31 and its `$3 / $15`
price from 2026-09-01. Record Gemini 3.1 Flash-Lite as Stable and only Gemini 3 Flash plus Gemini
3.1 Pro as Preview. Restrict the displayed
Gemini 3.1 Pro `$2 / $12` basis to prompts up to 200K tokens and disclose that the official
`$4 / $18` greater-than-200K tier is excluded rather than silently applying it.

### Preserve provider-native invocation limits

Do not normalize every provider into a single guessed context-window field. Store optional
`maxInputTokens`, `maxOutputTokens`, and `maxCombinedTokens` according to the provider's published
meaning, together with a per-model source URL and `verifiedAt: 2026-07-17`. Validate the Low,
Expected, and High per-iteration calls with a pure function before calculating an allocation.
Iterations are separate calls, so their totals do not determine single-call feasibility. Never
truncate or automatically split a task in this correction.

Require one selected model to support all three scenarios. Exclude an incompatible tier even when
it is cheaper, move to a compatible tier under the existing deterministic tier rules, and never
downgrade through an incompatible tier. When no catalog offering is compatible, return a distinct
`infeasible` task with `no-compatible-offering` plus structured input/output/context-limit failures.
Do not label that state as a budget hold, do not assign a model or cost, and never report
`allTasksActiveWithinBudget=true` while it exists.

### Recalculate complete provider plans locally

Build an independent allocation for OpenAI, Anthropic, and Google from the same source tasks,
settings, and GPT analysis. Each plan owns its Low / Expected / High totals, budget fit, active,
held, and infeasible counts, downgrades, and warnings. Selecting a product family swaps the displayed precomputed
plan and must not trigger `/api/analyze` or another network request.

### Version source persistence and result exports separately

Raise the recent-scenario schema to v3 to store `selectedProvider` alongside the existing source
state; continue to omit derived plans and comparison summaries. Migrate valid v1 records to Medium
priority plus OpenAI and valid v2 records to OpenAI, then recalculate all plans from the current
catalog. Raise JSON exports to v3 and include the selected plan, all three comparison summaries,
catalog snapshot, official sources, time-sensitive/preview conditions, exclusions, and heuristic
disclaimer. Markdown carries the same material in readable form.

### Isolate the stable release

Implement and verify this work only on `feature/provider-comparison`. The public Vercel URL and
`main` remain the stable OpenAI-only release until the feature passes tests, lint, typecheck, build,
mobile verification, review, merge, and an explicit production deployment. Documentation may
describe the branch contract but must not claim that provider comparison is already live.

### Localize the presentation without coupling calculation to language

Support Korean, English, and Japanese through a typed in-app dictionary and React context rather
than adding locale routes or another dependency. Store the locale under its own LocalStorage key,
update `<html lang>`, and render notices from semantic codes so a language change is immediate and
never calls `/api/analyze`. Keep calculation and JSON contracts locale-independent. Localize the
human-readable Markdown wrapper, while preserving user input, GPT rationale/risk text, model names,
machine enums, and precise technical terms without automatic translation.

## 2026-07-17 — Ver3 checkpoint 1 Best-fit offering design contract

### Freeze the approved API-only baseline

Tag commit `d3edd98` as `provider-comparison-stable` after P0/P1 review passes, then do design work
on `feature/best-fit-offerings`. The tag is a regression and rollback point for the reviewed
provider-comparison behavior; it does not mean that the five accepted P2 findings are fixed.

Checkpoint 1 changes only `SPEC.md`, `TASKS.md`, and `DECISIONS.md`. Do not change runtime types,
the GPT schema or Mock fixture, calculations, UI, LocalStorage/JSON versions, README, or submission
copy until this design checkpoint is reviewed.

### Optimize for minimum sufficiency, not maximum tier

The target product chooses a compatible route that meets an explicit minimum planning quality with
the least avoidable resource use. It does not maximize model tier and does not rank providers by
objective quality. `Avoided spend` is a disclosed counterfactual over executed compatible work,
not realized savings, and held work cannot inflate it.

Current `recommendedModelTier` remains a heuristic recommendation. It is not silently redefined as
the future hard `requiredQualityTier`. Current `frontier` data also remains distinct from future
`premium` terminology until a versioned adapter and migration exist. Once a quality floor is
implemented, Cost Saver cannot cross below it. Quality First follows the explicit one-tier,
trigger-bound policy defined below rather than an inherited unconditional upgrade.

### Keep analysis and route selection separate

GPT-5.6 remains the sole analyzer. A future schema may describe work mode, minimum quality,
capabilities, and upgrade conditions, but GPT still cannot price tokens, translate subscription
quota, compare providers, or choose the final route. Claude and Gemini APIs remain out of the
analysis path. The deterministic program owns feasibility, resource accounting, route choice,
fallbacks, held work, and every cost or selection explanation.

### Separate model identity from access offerings

Adopt `ModelDefinition` and `Offering` as target concepts, not as an immediate rewrite.
`ModelDefinition` owns model identity, family, planning tier, capabilities, and invocation limits.
`Offering` owns API/subscription access mode, supported surface, conditions, and provenance. API
price schedules and subscription quota are separate resource types. A subscription is not an API
model with a zero input/output price.

Make `Offering` a discriminated union. A model-bound offering must resolve a catalog model and uses
the tighter intersection of model and access-path limits. A model-opaque subscription needs a
complete, sourced quality/capability/limit profile before it can pass normal eligibility. A
user-observed profile or an unprofiled product remains a conditional alternative, never a confirmed
primary route, and must carry a compatible API fallback. Do not infer undisclosed facts from tier,
neighboring products, empty arrays, or free-form text.

Model limits and capabilities use complete/partial/unknown sourced profiles. Access paths separately
declare same-as-model, a narrower sourced bound, or unknown for both limits and capabilities.
Intersect constraints only when both sides are complete and provider-published; partial, unknown,
or user-observed knowledge is conditional. “Complete” means the source covers every constraint
applicable to that model/surface, not that every optional numeric limit must exist.

The current `ProviderModelPrice` and `ProviderCatalog` stay behind an API-offering adapter until
parity tests prove the new view. Reuse size bands, iteration rules, invocation-feasibility checks,
micro-USD arithmetic, priority ordering, deterministic tie-breaks, and active/held/infeasible
states. Keep `compareProviderPlans` as the API-only compatibility view rather than expanding it into
the subscription allocator.

API provider identity remains separate from extensible subscription provider names. This avoids
forcing ChatGPT, GitHub, GLM, or Custom subscription values into every current
`Record<ProviderId, ...>` consumer. The existing `OfferingFeasibilityFailure` name must be reviewed
before a future general `Offering` type is introduced so two meanings are not conflated.

Permit future user overrides only for the planning tier and standard-text price of an existing
verified catalog entry. Preserve and display the official default and source beside the labeled
override, provide a restore action, and persist/export both values. This does not reopen arbitrary
API provider or model creation. `Custom subscription` describes an access resource and does not add
a custom API model.

### Keep cash and quota in separate ledgers

Show API spend, subscription usage, and any new subscription commitment separately. Existing
included subscription use has `$0` incremental cash cost only while a compatible surface and usable
capacity remain; it still consumes quota with opportunity cost. Charge a newly selected monthly
subscription once per plan, not per task. Never add requests, credits, a remaining percentage, or
opportunity cost to USD.

Exact numeric depletion requires provider-published units or user-observed calibration. An opaque
or private limit produces conditional availability and an API fallback, never an invented task
count. A chat-only offering cannot satisfy IDE/CLI or batch work.

Keep availability, quota shape, consumption rule, evidence, reset, and overage as separate closed
fields. A pure resolver returns same-unit Low / Expected / High demand or an unknown reason. Exact
published demand can reserve confirmed capacity; observed ranges and opaque limits stay
conditional. Planning uses a derived quota ledger and never mutates saved remaining quota. Missing
or mismatched units, non-finite values, invalid ranges, and unknown overage cannot become zero use.

Included and remaining capacity each retain provenance; remaining/percentage requires a timestamped
user or connector snapshot. Reset data never auto-replenishes capacity. Crossing a reset boundary
after the snapshot makes availability uncertain until refreshed. Paid overage confirms capacity
only when its Offering scope, effective dates, unit, deficit, optional cap, rate, and evidence all
apply; opaque quota and unknown applicability cannot use it.

The Ver3 budget is total incremental cash. For each scenario, sum active API spend, each distinct
new subscription fee used by an active primary route once, and source-backed paid overage. Existing
owned fees are sunk commitments and stay outside this budget. Unused, fallback-only, held-only, and
infeasible-only subscriptions do not activate a fee; removing the last active assignment removes
the fee. Expected determines fit and holds, while High produces the risk warning. Keep each cash
component and native quota visible in separate ledgers even though incremental cash is compared to
one `incrementalCashBudgetUsd` boundary.

Do not silently reinterpret a restored legacy `budgetUsd`. The checkpoint that persists the new
field owns an atomic storage-version adapter, retains the old amount as an API-only legacy draft,
and requires explicit user confirmation before using it as a total-incremental-cash budget.

Store ownership and commitment explicitly. Owned resources carry an informational existing fee;
candidate-new resources carry a finite evidenced USD fee for one plan period. Only a valid
candidate-new commitment used by an active primary route contributes its distinct fee.

Owned quota uses a timestamped remaining snapshot. A not-yet-purchased candidate cannot have that
snapshot, so it needs provider-published initial capacity for the same plan period; otherwise it is
conditional. Activating a valid candidate initializes only the derived ledger and never rewrites
the source allowance.

### Add Best-fit as an orchestrator, not a big-bang rewrite

Introduce adapters and prove current API-plan parity first. Then add subscription candidates and a
new deterministic route orchestrator above the stable API calculation. It filters incompatible and
below-minimum routes, evaluates owned quota separately from API cost, selects the minimum-sufficient
least incremental-cash route, preserves scarce quota for important work, supplies fallbacks, and
holds lower-priority work when no compatible resource remains.

The normalized standard-price comparison may remain as a historical/reference view, but an
executable Best-fit API route must resolve effective dates and token-range conditions first. An
expired introductory rate or an excluded long-context surcharge cannot be presented as the route's
available execution price.

Task priority remains the first ordering signal. The current single global deadline is
reference-only and cannot rank tasks against each other. Ver3 therefore adds an optional,
user-owned task deadline, user-owned bounded `failureImpact`, and bounded GPT `failureRisk`.
Reserve scarce resources by priority, earlier deadline, higher impact, higher risk, and stable input
index; use the inverse business dimensions plus the same stable index for relief. Migrated legacy
impact is `unspecified`, not fabricated; every new task initializes to visibly selected Medium.
Free-form risk text never drives selection.

Map `interactive` to `chat`, `coding-agent` to `ide-cli`, and `batch` to `batch` for the initial
work-mode/surface contract. Do not infer a substitute surface when an offering lacks the mapped
one. Use closed, versioned capability and upgrade codes; required capabilities must be a subset of
the resolved profile, and unknown codes are rejected. Derive High failure exposure only from High
user impact plus non-Low GPT risk, and deadline retry risk only from an explicit deadline plus High
risk. Cost Saver chooses the least-cash sufficient route; Balanced prefers a confirmed owned route;
Quality First adds at most one tier only for a closed trigger. All remain bounded by minimum quality,
compatibility, budget, quota, and no-false-precision rules.

When hard filtering leaves no compatible sub-Premium route but does leave Premium, generate the
closed minimum-sufficient Premium fallback trigger even if no risk trigger exists. This is
compatibility fallback, not unconditional Quality First headroom.

Separate task, route, and full-plan ordering. Every strategy's confirmed route comparator ends in
provider ID and stable Offering ID, so object enumeration never breaks a tie; native quota units
are not converted for ordering. Evaluate a new subscription by rebuilding a complete plan with its
shared fee, not by assigning the fee to the first task. Starting from owned resources plus APIs,
repeatedly accept only the best strict add-one full-plan improvement. This bounded deterministic
heuristic is explainable but does not claim a global optimum or combined-subscription exhaustive
search.

Rank Economy/Balanced/Premium as 0/1/2. The quality key first penalizes target shortfall and then
excess above target. Budget fit, task status, quality vectors, cash, activated IDs, and assignment
IDs all compare lexicographically with explicit ascending ranks. Per-route variable cash includes
Expected API cash and paid-overage delta, while shared fixed fees remain plan-level only.

Balanced prefers owned capacity only while the work fits included quota. A paid-overage route is a
cash-bearing candidate and competes with API on Expected variable cash before route-kind tie-breaks.
Before holding, try the next confirmed compatible route and recalculate shared fees and overage.

Define avoided spend conservatively. For every active guaranteed task, choose the cheapest
compatible Premium API at the same `pricingAsOf`, with provider and Offering ID tie-breaks. If any
active task lacks one, the metric is null. Subtract the complete selected Expected incremental cash,
including each new fee and paid overage once. Exclude held/infeasible work, use API fallback cash for
conditional suggestions, and report a negative difference as additional spend rather than hiding it
behind zero savings. Export the baseline task set, Offering IDs, cash components, and pricing date.

### Version source and result meaning only when implementation changes

Do not bump LocalStorage or JSON during this documentation checkpoint. The first live task/GPT
schema change in checkpoint 3 is also the first Ver3 LocalStorage version boundary; it cannot wait
for checkpoint 8. Freeze complete v1/v2/v3 parsers so they do not compose mutable live schemas, and
migrate through sequential adapters. Preserve a valid v3 response as a legacy API-only snapshot;
never invent new GPT fields, and require explicit reanalysis before Best-fit allocation.

Delete a historical record only when its own frozen parser proves it malformed. Adapter,
target-validation, or rewrite failure preserves the original bytes and returns a recoverable state;
unknown future versions remain untouched. Continue storing source data, not derived routes. Keep
JSON v3 as the historical API-only export and version result meaning independently from LocalStorage.

### Reserve self-hosting for Phase 2 and freeze unrelated P2 work

Ver3 supports API and subscription offerings only. Cloud subscriptions for model families that may
also run locally are represented as `Custom subscription`; they are not self-hosted execution.
GPU memory, throughput, electricity, hardware depreciation, and local inference are Phase 2 and
must not appear as implemented hero claims.

The provider-comparison P2 findings—Sonnet price-date resolution, OpenAI's independent input cap,
320px card readability, radio comparison descriptions, and locale-bound Markdown feedback—remain
recorded but unchanged. They are outside Ver3 checkpoint 1 and require a separate approval.

When Ver3 functionality is implemented, use the same minimum-sufficient product definition in the
localized UI, README, Devpost, and video. Until then, documentation must distinguish a target
contract from current API-only behavior and must not advertise subscription allocation as live.
