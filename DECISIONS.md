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
Intersect constraints only when both sides are complete and carry resolver-issued
provider-published evidence; partial, unknown, or user-observed knowledge is conditional.
“Complete” means the source covers every constraint applicable to that model/surface, not that
every optional numeric limit must exist.

The current `ProviderModelPrice` and `ProviderCatalog` stay behind an API-offering adapter until
parity tests prove the new view. Reuse size bands, iteration rules, invocation-feasibility checks,
micro-USD arithmetic, priority ordering, deterministic tie-breaks, and active/held/infeasible
states. Keep `compareProviderPlans` as the API-only compatibility view rather than expanding it into
the subscription allocator.

API provider identity remains separate from extensible access-provider identity. Every Offering,
including a model-opaque subscription, has an immutable locale-independent access-provider ID.
Every execution path uses the same structured `(providerId, offeringId, resourceId)` identity: APIs
use a null resource, while subscriptions use their stable source resource ID. This avoids forcing
ChatGPT, GitHub, GLM, or Custom subscription values into every current `Record<ProviderId, ...>`
consumer and closes ties between multiple accounts for one Offering. Registered IDs come from the
registry; Custom access providers use the exact planner-owned `custom.<stable-id>` namespace. The
suffix is a stable identifier, not a display label or unvalidated provider name. The existing
`OfferingFeasibilityFailure` name must be reviewed before a future general `Offering` type is
introduced so two meanings are not conflated.

Permit future user overrides only for the planning tier and standard-text price of an existing
verified catalog entry. Preserve and display the official default and source beside the labeled
override, provide a restore action, and persist/export both values. This does not reopen arbitrary
API provider or model creation. `Custom subscription` describes an access resource and does not add
a custom API model.

### Treat persisted provenance as a claim, not authority

UI input, LocalStorage, and imports may store exact catalog/preset references, connector references,
and user observations, but never a trusted `provider-published` or verified-connector value. Only an
internal resolver creates those evidence types. It binds a provider claim to an immutable
allowlisted registry ID/version/entry/field, or validates a registered connector adapter,
authenticated user/account/resource binding, snapshot version, freshness, replay state, and signed
receipt. A URL, timestamp, discriminator, Origin header, or exported snapshot is not authority.

Restore resolves exact historical versions again; it never silently selects the latest registry.
Unknown versions, binding failures, offline connectors, stale/replayed snapshots, and invalid
receipts preserve source state but make the dependent fact unknown. The route becomes conditional
with a compatible API fallback and closed reason code. Custom subscription fields and user
overrides remain user-supplied and cannot promote themselves to official evidence. Exported
resolved provenance is audit-only and has no import authority.

### Keep cash and quota in separate ledgers

Show API spend, subscription usage, and any new subscription commitment separately. Existing
included subscription use has `$0` incremental cash cost only while a compatible surface and usable
capacity remain; it still consumes quota with opportunity cost. Charge a newly selected monthly
subscription once per plan, not per task. Never add requests, credits, a remaining percentage, or
opportunity cost to USD.

Exact numeric depletion requires resolver-issued provider-published units or user-observed
calibration. An opaque or private limit produces conditional availability and an API fallback,
never an invented task count. A chat-only offering cannot satisfy IDE/CLI or batch work.

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
snapshot, so it needs resolver-issued provider-published initial capacity for the same plan period;
otherwise it is conditional. Activating a valid candidate initializes only the derived ledger and
never rewrites the source allowance.

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
risk. After the hard minimum and Premium-trigger filters, Cost Saver compares Expected incremental
cash before quality excess. Balanced compares quality fit and confirmed owned included capacity
before cash; Quality First adds at most one tier only for a closed trigger and then uses Balanced.
All remain bounded by compatibility, budget, quota, and no-false-precision rules.

When hard filtering leaves no compatible sub-Premium route but does leave Premium, generate the
closed minimum-sufficient Premium fallback trigger even if no risk trigger exists. This is
compatibility fallback, not unconditional Quality First headroom.

Separate task, route, conditional-diagnostic, and full-plan ordering. Every confirmed route
comparator ends in the structured provider/Offering/resource key; conditional alternatives use
primary key, fallback key, and a closed versioned reason-code rank. The same identity appears in
task results, quota/fee ledgers, Premium baselines, plans, and exports, so multiple accounts and
object enumeration cannot break a tie. Native quota units are not converted for ordering. Evaluate
a new subscription by rebuilding a complete plan with its shared fee, not by assigning the fee to
the first task. Starting from owned resources plus APIs, repeatedly accept only the best strict
add-one full-plan improvement. This bounded deterministic heuristic is explainable but does not
claim a global optimum or combined-subscription exhaustive search.

Rank Economy/Balanced/Premium as 0/1/2. The quality key first penalizes target shortfall and then
excess above target. Cost Saver route ordering is Expected variable cash, quality key, route kind,
then canonical route key; a `$0` owned Balanced route therefore beats a `$1` Economy API, while an
equal-cash tie selects Economy. Premium remains ineligible without its closed trigger. Cost Saver
full plans compare Expected and High cash before their quality vector after the common budget-fit
and task-status prefix. Balanced and Quality First retain quality/capacity before cash. Shared fixed
fees remain plan-level only.

Balanced prefers owned capacity only while the work fits included quota. A paid-overage route is a
cash-bearing candidate and competes with API on Expected variable cash before route-kind tie-breaks.
Before holding, try the next confirmed compatible route and recalculate shared fees and overage.

Define avoided spend conservatively. For every active guaranteed task, choose the cheapest
compatible Premium API at the same `pricingAsOf`, with the canonical API route key as tie-break. If
any active task lacks one, the metric is null. Subtract the complete selected Expected incremental
cash, including each new fee and paid overage once. Exclude held/infeasible work, use API fallback
cash for conditional suggestions, and report a negative difference as additional spend rather than
hiding it behind zero savings. Export the baseline task set, structured route identities, cash
components, and pricing date.

### Version source and result meaning only when implementation changes

Do not bump LocalStorage or JSON during this documentation checkpoint. The first live task/GPT
schema change in checkpoint 3 is also the first Ver3 LocalStorage version boundary; it cannot wait
for checkpoint 8. Freeze complete v1/v2/v3 parsers so they do not compose mutable live schemas, and
migrate through sequential adapters. Preserve a valid v3 response as a legacy API-only snapshot;
never invent new GPT fields, and require explicit reanalysis before Best-fit allocation.

Delete a historical record only when its own frozen parser proves it malformed. Adapter,
target-validation, or rewrite failure preserves the original bytes and returns a recoverable state;
unknown future versions remain untouched. Continue storing source data, not derived routes. Keep
JSON v3 as the historical API-only export and version result meaning independently from
LocalStorage. Persist only registry/connector references and user observations; re-resolve evidence
authority on restore, and never accept an exported resolved snapshot as import authority.

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

## 2026-07-17 — Ver3 checkpoint 2 passive offering adapters

### Preserve the reviewed runtime

Add the target model, Offering, evidence, eligibility, and route-identity contracts beside the
current domain types. Do not connect them to the live allocator, UI, LocalStorage, or exports in
this checkpoint. The current 3×3 catalog remains the runtime source and must round-trip through the
new adapter without changing any legacy field or provider-plan result.

### Resolve authority before calculation

Persist only strict catalog, preset, connector, or user-observed source shapes. Only the internal
allowlisted registry resolver may issue provider-published evidence, and it must match the exact
registry ID, version, entry, claim, subject, field, and frozen claim value. One legitimate claim
cannot authenticate a different model, access path, capability, limit, or opaque profile. An
official-looking URL, exported resolved object, user override, unknown preset, or unavailable
connector never becomes trusted authority. The bundled registry is an independent recursively
frozen snapshot, and inherited object-property names are never registry entries or claims.

### Keep unsupported knowledge conditional

The current provider catalog does not contain sourced capability claims. The adapter therefore
keeps capabilities unknown instead of inferring them from model names. Partial, unknown, observed,
or otherwise unresolved eligibility remains conditional and requires a future API fallback;
complete trusted hard limits can still reject an impossible route without upgrading incomplete
knowledge to confirmed eligibility.

The Economy/Balanced/Premium position is planner-authored budget guidance, not provider-published
model identity. Keep it out of the provider claim value and verify the versioned legacy-tier
adapter through an explicitly named planner resolver before it can drive a hard quality boundary.

### Use one structured route identity

Use the locale-independent tuple `(providerId, offeringId, resourceId)` everywhere in the target
layer. API resources are always `null`; subscription resources use stable non-empty IDs. Compare
tuple elements directly, reject duplicates and mismatched references, and use only registered IDs
or the planner-owned `custom.<stable-id>` provider namespace.

### Preserve registry history and narrow projection authority

Published registry versions are immutable data, not aliases over the mutable live catalog. Keep v1
and v2 as separate recursively frozen object graphs behind exact catalog/version lookup, record the
v1 canonical manifest digest, and reject unknown versions without selecting the current version.
Evidence checks include catalog ID, version, and entry as well as claim, subject, field, and value.
The current adapter explicitly uses v2; historical evidence continues to resolve against v1.

Legacy projection is not an evidence-validation API. Accept only the closed current provider/tier
reference, resolve the canonical entry internally, and return a fresh deep projection. Never accept
a caller-supplied `ResolvedApiCatalogEntry`, because a shallow clone could retain valid evidence
while replacing its model, price, or limits.

Keep the closed conditional-reason list in SPEC and `CONDITIONAL_REASON_CODES` identical and in the
same order. A contract test reads the documented union so future parser/export work cannot drift
from runtime values.

## 2026-07-17 — Ver3 checkpoint 3 workload and storage contract

### Put the storage safety gate before the live schema change

Freeze complete v1, v2, and v3 scenario parsers in a historical module whose only runtime
dependency is Zod. Pin static JSON fixture bytes with SHA-256 digests. LocalStorage v4 is the first
Ver3 source-state version and stores an explicit `api-analysis-v1` / `legacy-api-only` or
`best-fit-analysis-v2` / `best-fit` snapshot. Migration runs v1 → v2 → v3 → v4 and adds only the
previously approved priority/provider adaptations plus user-owned `deadlineDate: null` and
`failureImpact: unspecified`. It never synthesizes a GPT-derived v2 field.

Delete only data rejected by its own declared-version parser. If adaptation or target validation
fails, return a recoverable migration state and leave the original bytes untouched. Validate the
entire v4 candidate before replacing storage. A rewrite failure leaves the source bytes intact but
still permits the validated in-memory legacy plan to load.

### Separate the versioned workload contract from route choice

`AnalyzeSuccessResponseV2` retains the existing response envelope and adds the exact analysis
document discriminator `best-fit-analysis-v2`. Each task keeps the legacy heuristic
`recommendedModelTier` and separately adds work mode, hard minimum planning quality, closed
capability IDs, closed upgrade-condition codes, and bounded failure risk. The prompt and strict
schema prohibit price, quota, provider, Offering, and final-route decisions. GPT-5.6 remains the
only analyzer.

Use `deadlineDate: YYYY-MM-DD | null` as a time-zone-free user date. New tasks visibly start with
Medium failure impact; migrated tasks remain `unspecified`. The existing task editor exposes these
two source fields now because otherwise the v4 contract would contain a hidden default. Checkpoint
7 still owns their integration with subscription resources and the total-incremental-cash UI.

Map `interactive` to `chat`, `coding-agent` to `ide-cli`, and `batch` to `batch` in one pure
crosswalk. Free-form risk text is explanatory only. Closed trigger derivation uses High user impact
plus non-Low GPT risk, an explicit task deadline plus High risk, or an explicit upgrade code.

### Preserve legacy planning while enforcing the new floor

The reviewed API-only allocator accepts either frozen v1 or v2 analysis. Legacy data retains its
historical strategy behavior. For v2 only, map `premium` to the legacy catalog's `frontier`
position and prevent initial selection or budget relief from crossing below the hard minimum.
This does not activate checkpoint-2 Offering adapters or implement subscription/Best-fit routing.

Keep historical API-only exports on JSON v3. Because the v2 floor can change a plan, use JSON v4
for `best-fit-analysis-v2` and include the new source and workload fields rather than silently
changing or under-specifying v3. Markdown carries the same fields with localized labels. Future
route/resource result meaning receives another independently versioned export contract.

### Scope checkpoint-3 Active and fit claims

The checkpoint-3 API-family allocator applies standard API price, the v2 minimum-quality floor,
all Low / Expected / High invocation limits, and budget. It does not yet apply work-mode surfaces or
required capabilities because the current provider catalog deliberately records capability
knowledge as `unknown`. Treat `active` as a cost projection rather than confirmed Offering
eligibility, disclose that boundary in UI and Markdown, and export it as a machine-readable JSON v4
eligibility basis. Preserve legacy JSON v3 and describe legacy infeasibility using invocation limits
only because `api-analysis-v1` has no minimum-quality floor.

### Add generalized API pricing without changing the compatibility view

Checkpoint 4 resolves API standard-text prices in a separate pure seam keyed by canonical
provider/tier lookup and explicit `pricingAsOf`. Sonnet 5 changes at the documented
`2026-08-31`/`2026-09-01` boundary. Gemini Pro input above 200K produces a conditional result with
no cost because long-context pricing remains excluded; it is never silently charged at either the
base or excluded rate. Invocation-limit failure is independently ineligible, while a successfully
priced candidate still does not claim full Offering eligibility.

Keep the reviewed `estimateTaskCost` / `allocateBudget` / `compareProviderPlans` path unchanged as
the normalized compatibility view. This intentionally leaves the compatibility-view Sonnet P2
open while completing date-aware behavior for the new generalized seam. Normalize official or
user-supplied rates to integer micro-USD-per-million values and round the combined input/output
scenario once.

Introduce override source operations now, but defer their UI to checkpoint 7 and persistence/export
to checkpoint 8. An override is bound to one exact versioned registry entry, remains visibly
`user-supplied`, and may change only planning tier and standard-text input/output rates from an
explicit date. Official defaults and evidence stay immutable; restoration removes the override
instead of copying defaults into user state. This supersedes the old release-candidate decision to
defer all price override work, without exposing an editor in the current checkpoint.

## 2026-07-17 — Ver3 checkpoint 5 subscription resource engine

### Keep source claims and calculation authority separate

Accept only strict stored catalog, preset, connector, or user-observed evidence inputs. A resolved
resource and its resolution are module-issued objects, and the resource is bound to the explicit
`planningAsOf` used to assess snapshot/reset freshness. Offering eligibility, evaluated API cost,
quota demand, resource, resolution, and derived ledgers must be the exact issued values; copied
objects do not preserve authority. Future provider-published consumption and overage evidence must
match the exact registry version, entry, claim, subject, field, and canonical claim value.

Do not add fictitious subscription claims to make a positive test pass. The current registry has no
subscription capacity/consumption/overage profile, and the connector checker is diagnostic only—it
never mints `verified-connector-snapshot`. Current user observations and illustrative presets stay
conditional. A conditional subscription suggestion needs a resolver-issued eligible API Offering
and the exact priced API evaluation; current unknown access/capability knowledge cannot be promoted
to a guaranteed fallback.

### Use immutable fixed-decimal quota ledgers

Limit subscription quota to six decimal places and represent it internally as integer microunits.
Parse source quota and candidate fee decimals exactly with no tolerance; reserve floating-point
residue handling only for derived arithmetic such as `0.1 × 3`. This makes exact fractional
boundaries deterministic and prevents a positive source amount from becoming zero. Demand results
are bound to the exact quota object, resource subject, task ID, and demand-driving iteration count.
Scenario multipliers operate on integer source microunits, and issued demand metadata carries the
exact range into reservation. Unit-valued numbers are display projections and are not converted
back into authoritative demand or overage amounts. Derived reservations never
mutate source remaining quota, never infer numbers for opaque quota, and require re-resolution if
`planningAsOf` changes. Reset metadata can downgrade a stale snapshot but never refill it.

Observed/calibrated capacity stays conditional and reserves High only as a planning suggestion.
Confirmed provider demand would reserve Expected. An insufficient observed account does not stop
the canonical selector from trying another account; duplicate/mismatched candidate routes are
rejected. An API fallback rebuilds its eligibility requirement from the same analysis used for
pricing. Paid overage applies its cap cumulatively across the derived ledger and keeps native quota
units and integer micro-USD cash separate.

### Keep commitment accounting below the plan selector

Existing subscription use contributes zero incremental cash while retaining quota consumption. A
candidate subscription contributes its exact full plan-period fee once per canonical resource, not
once per task. The commitment ledger is an accounting primitive only. Checkpoint 6 chooses
activations and complete plans, recalculates shared fees/overage, applies the cash budget, and emits
active/held/infeasible route results. Checkpoints 7 and 8 remain responsible for user-facing
resource input and LocalStorage/export version changes.
