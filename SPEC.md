# Frontier Workload Planner — MVP Specification

Last updated: 2026-07-17

Internal target: 2026-07-21

## Product statement

Frontier Workload Planner turns up to eight task descriptions into explainable, budget-aware
recommended plans across three published model catalogs. GPT-5.6 is the only analysis engine;
Claude and Gemini APIs are never called. The cross-provider tier mapping is a budget-planning
heuristic, not a quality ranking, benchmark, quote, or mathematically optimal allocation.

## Fixed MVP scope

- One-page workflow with up to eight tasks
- User-owned High / Medium / Low priority for every task
- One GPT-5.6 request for all tasks
- GPT recommends a model tier, never a concrete model or price
- Program maps the same tier to one model in each supported provider catalog
- Deterministic per-provider Low / Expected / High cost calculation
- OpenAI, Anthropic, and Google comparison summaries plus a selected product-family plan
- Expected-cost budget allocation, low-priority task holding, and a High-cost risk warning
- One per-task cost bar chart
- One recent scenario in LocalStorage
- Markdown copy and JSON export
- Mock and Live modes
- Server-only OpenAI API key

The calculation stage maps each GPT tier to one catalog model per provider. These labels express
relative planning positions inside this application only; they do not assert equivalent quality or
an objective order between vendors.

| GPT tier | OpenAI | Anthropic | Google |
| --- | --- | --- | --- |
| `economy` | GPT-5.6 Luna | Claude Haiku 4.5 | Gemini 3.1 Flash-Lite |
| `balanced` | GPT-5.6 Terra | Claude Sonnet 5 | Gemini 3 Flash |
| `frontier` | GPT-5.6 Sol | Claude Fable 5 | Gemini 3.1 Pro |

## Feature branch target — not production yet

Stable `main` remains the production release at <https://frontier-workload-planner.vercel.app>.
The following provider-comparison extension belongs to `feature/provider-comparison` and must not
be described as deployed until it is verified, merged, and redeployed:

1. One to eight task names, descriptions, and user priorities in a single-page UI.
2. Budget, reference deadline, and planning-strategy controls.
3. Explicit Mock or Live submission to `POST /api/analyze`.
4. Server-side validation and one GPT-5.6 Responses API Structured Output for all tasks.
5. One immutable GPT analysis projected through three published standard-text price catalogs.
6. Deterministic Low / Expected / High costs and complete budget plans for every provider.
7. Product-family selection that swaps the displayed plan without another API request.
8. Priority-first Expected-cost allocation, explicit active/held work, High-cost warnings, task cards, and one cost chart.
9. One validated recent scenario in LocalStorage, restored without a new API request.
10. Markdown clipboard copy and versioned JSON export of the selected plan and comparison summaries.
11. Empty, loading, success, input-error, configuration-error, storage-error, and upstream-error states.

## Responsibility boundary

| GPT judgment | Deterministic program calculation |
| --- | --- |
| Task type | Tier + provider → catalog model |
| Complexity | Size band → fixed token range |
| Reasoning depth | Provider catalog and standard-text pricing lookup |
| Expected iterations (1–5) | Low / Expected / High cost |
| Input and output size bands | Budget-aware allocation rules |
| Uncertainty and risk factors | Budget warnings and chart values |
| Recommended model tier | Currency formatting and totals |
| — | Per-provider totals, budget fit, and active/held/infeasible counts |
| — | Invocation feasibility, user priority, tier downgrades, and held-work selection |

GPT must not return a provider choice, final token counts, prices, costs, budget allocation, or
completion time. A Claude or Gemini endpoint is never used for classification, validation, or
re-analysis.

## Data contract

### Input

- `mode`: `mock | live`
- `tasks`: 1–8 items
- `tasks[].id`: 1–64 characters
- `tasks[].name`: 1–100 characters
- `tasks[].description`: 1–2,000 characters
- `tasks[].priority`: `high | medium | low`
- Entire JSON request: at most 96 KiB in UTF-8

Unknown keys are rejected.

### Structured GPT output per task

- `taskId`: exact input ID
- `taskType`: `software-development | research | writing | data-analysis | planning | creative | multimodal | other`
- `complexity`: `low | medium | high | very-high`
- `reasoningDepth`: `light | moderate | deep`
- `expectedIterations`: integer 1–5
- `estimatedInputSize`: `xs | s | m | l | xl`
- `estimatedOutputSize`: `xs | s | m | l | xl`
- `uncertainty`: `low | medium | high`
- `recommendedModelTier`: `economy | balanced | frontier`
- `riskFactors`: 0–3 short strings
- `rationale`: at most two short sentences

The server validates the parsed output again and verifies count, order, and task IDs.

Both size fields describe **one model iteration**. Input is the complete billable context for one call, including system and task context. Output includes all billable reasoning and visible output tokens for one call. `expectedIterations` alone represents repeated calls or substantial revision passes.

## Deterministic calculation contract

### Provider catalog and standard model prices

Prices are fixed program data, expressed as USD per 1M input/output tokens, and were verified from
the providers' official documentation on 2026-07-17.

| Provider | Tier | Catalog model ID | Display model | Input / 1M | Output / 1M | Conditions |
| --- | --- | --- | --- | ---: | ---: | --- |
| OpenAI | `economy` | `gpt-5.6-luna` | GPT-5.6 Luna | $1.00 | $6.00 | — |
| OpenAI | `balanced` | `gpt-5.6-terra` | GPT-5.6 Terra | $2.50 | $15.00 | — |
| OpenAI | `frontier` | `gpt-5.6-sol` | GPT-5.6 Sol | $5.00 | $30.00 | — |
| Anthropic | `economy` | `claude-haiku-4-5` | Claude Haiku 4.5 | $1.00 | $5.00 | — |
| Anthropic | `balanced` | `claude-sonnet-5` | Claude Sonnet 5 | $2.00 | $10.00 | introductory price through 2026-08-31; $3 / $15 from 2026-09-01 |
| Anthropic | `frontier` | `claude-fable-5` | Claude Fable 5 | $10.00 | $50.00 | — |
| Google | `economy` | `gemini-3.1-flash-lite` | Gemini 3.1 Flash-Lite | $0.25 | $1.50 | stable |
| Google | `balanced` | `gemini-3-flash-preview` | Gemini 3 Flash | $0.50 | $3.00 | preview |
| Google | `frontier` | `gemini-3.1-pro-preview` | Gemini 3.1 Pro | $2.00 | $12.00 | preview; prompt ≤200K tokens |

Catalog sources:

- OpenAI pricing: <https://developers.openai.com/api/docs/pricing>
- OpenAI models: <https://developers.openai.com/api/docs/guides/latest-model>
- Anthropic pricing: <https://platform.claude.com/docs/en/about-claude/pricing>
- Anthropic models: <https://platform.claude.com/docs/en/about-claude/models/overview>
- Google pricing: <https://ai.google.dev/gemini-api/docs/pricing>
- Google models and Stable/Preview status: <https://ai.google.dev/gemini-api/docs/models>

Every comparison uses **standard uncached text** prices. The engine intentionally excludes cache
writes, cache reads or discounts, Batch/Flex/Priority processing, tool and grounding fees, and
long-context surcharges. In particular, Gemini 3.1 Pro prompts above 200K have an official
$4 / $18 input/output tier, but this branch does not apply it. The UI and exports must expose this
exclusion and must not present the result as an invoice estimate for excluded workloads.

### Token bands per iteration

| Band | Input Low / Expected / High | Output Low / Expected / High |
| --- | --- | --- |
| `xs` | 500 / 1,000 / 2,000 | 250 / 500 / 1,000 |
| `s` | 2,000 / 4,000 / 8,000 | 500 / 1,000 / 2,000 |
| `m` | 8,000 / 16,000 / 32,000 | 2,000 / 4,000 / 8,000 |
| `l` | 32,000 / 64,000 / 128,000 | 8,000 / 16,000 / 32,000 |
| `xl` | 128,000 / 192,000 / 256,000 | 32,000 / 64,000 / 96,000 |

The maximum input for one modeled iteration is 256K. This can exceed Gemini 3.1 Pro's 200K
standard-price condition; the comparison still applies the catalog's base `$2 / $12` planning rate
and visibly discloses that the official `$4 / $18` long-context tier is excluded. Multiple iterations
increase scenario totals without changing the per-request size-band classification.

### Scenario formula

- Low iterations: `max(1, expectedIterations - 1)`
- Expected iterations: `expectedIterations`
- High iterations: `expectedIterations + 1`; this may be 6 because the schema's maximum of 5 describes the expected case, not an execution cap
- Scenario token totals: `per-iteration band value × scenario iterations`
- Scenario input rate: selected provider model's standard uncached input rate
- Scenario cost: `(total input × standard input rate + total output × standard output rate) / 1,000,000`

Costs and budget comparisons are rounded to integer micro-USD before summing or comparing. Returned token values are scenario totals across all iterations.

### Invocation feasibility

The catalog records provider-native invocation limits rather than forcing every provider into one
synthetic context-window field:

| Product family | Models | `maxInputTokens` | `maxOutputTokens` | `maxCombinedTokens` |
| --- | --- | ---: | ---: | ---: |
| OpenAI | GPT-5.6 Luna / Terra / Sol | — | 128,000 | 1,050,000 |
| Anthropic | Claude Haiku 4.5 | — | 64,000 | 200,000 |
| Anthropic | Claude Sonnet 5 / Fable 5 | — | 128,000 | 1,000,000 |
| Google | Gemini 3.1 Flash-Lite / 3 Flash / 3.1 Pro | 1,048,576 | 65,536 | — |

Every model limit object includes its official `sourceUrl` and `verifiedAt: 2026-07-17`. OpenAI
limits come from each model page, Anthropic limits from the official model overview, and Google
input/output limits from each individual model page.

`validateInvocationFeasibility(model, tokenScenario)` is a pure function. For each Low, Expected,
and High **single invocation** it independently checks the published input limit, output limit, and
combined context limit when that field exists. It returns structured `input-limit-exceeded`,
`output-limit-exceeded`, and `context-limit-exceeded` failures with actual and allowed token counts.
Iterations are not multiplied into this feasibility check because each iteration represents another
call. The planner never truncates tokens or automatically splits work.

An allocation candidate must support all three scenarios on one model. An incompatible tier is
excluded even when its projected price is lower. The engine first selects the closest compatible
tier at or above the strategy target, falling back to a compatible lower tier only when no higher
candidate exists under the existing tier heuristic. Budget relief may move only between compatible
tiers. If no catalog model for a task/provider pair supports all three scenarios, the task becomes
`infeasible` with `no-compatible-offering` plus per-model scenario failures. It is not a budget hold,
receives no model or cost, is excluded from totals, and forces `allTasksActiveWithinBudget=false`.
Active and budget-held tasks also retain failures for every excluded offering so the UI and exports
can explain why a cheaper or strategy-target tier was not eligible.

## Budget allocation contract

Planning controls accept a budget from $0.01 through $10,000, a reference deadline from 1 to 90 days, and one strategy:

- `cost-saver`: begin one tier below GPT's recommendation, clamped at Economy
- `balanced`: begin at GPT's recommendation
- `quality-first`: begin one tier above GPT's recommendation, clamped at Frontier

The engine builds a complete independent allocation for every provider from the same task and GPT
analysis snapshots. Selecting a product family only chooses which existing plan is displayed; it
does not call `/api/analyze` or a vendor API.

Within each provider, if the initial Expected total exceeds the budget, lower one eligible task to its next compatible lower tier and recalculate until the plan fits or no active task has a compatible lower tier. The budget-relief order is deterministic: lower user priority (`low`, then `medium`, then `high`), lower GPT-recommended tier, lighter reasoning, lower complexity, lower uncertainty, then earlier input order. The same task may be lowered again if it remains first in that ordering.

If every active task is already at its lowest compatible tier and its Expected total still exceeds the budget, move the first task in that same order to `held`, then restart the remaining active tasks from their compatible strategy targets. Repeat until active Expected cost fits. Held tasks remain visible in input order but receive no tier, model, or execution cost and are excluded from Low / Expected / High totals and the High warning. Increasing the budget recalculates from the same GPT analysis and can reactivate held work without another API request. It cannot make an `infeasible` task executable unless the task analysis or catalog limits change.

Uncertainty only protects higher-uncertainty work from earlier budget relief; it does not widen the numeric token bands. `minimumExpectedCostUsd` is the sum of each task's least expensive compatible Expected offering before budget holds and is `null` when any task has no compatible offering. High is compared after allocation for active tasks only and produces a risk warning only when it is strictly greater than the budget.

The deadline is reference information. It does not alter token estimates, costs, or assigned tiers, and this MVP does not claim detailed duration prediction.

## Recent scenario contract

The app keeps at most one recent successful scenario under the fixed browser key `frontier-workload-planner:recent-scenario`. A new successful analysis overwrites the previous record. A valid settings or provider-selection change updates the record without another GPT request.

Stored schema version 3 contains only:

- `schemaVersion` and `savedAt`
- `selectedProvider`: `openai | anthropic | google`
- the submitted task names, descriptions, and priorities
- valid budget, deadline, and strategy settings
- the sanitized successful analysis response

Derived provider comparisons and `BudgetAllocationPlan` objects are not stored. Restore validates the full schema, unique task IDs, and exact task/analysis order, then recalculates all provider plans with the current catalog and calculation rules. Restore never calls `/api/analyze` and never triggers Live analysis.

Valid schema version 1 records are migrated by assigning `medium` priority and selecting OpenAI.
Valid schema version 2 records retain their priorities and select OpenAI. Both are rewritten as v3
on a best-effort basis. Malformed JSON or a damaged current-version record is ignored and removed. An unknown future schema version is preserved but not loaded. Storage access or quota errors remain non-blocking, and the user can explicitly delete the record. After deletion, settings-only or provider-selection edits do not recreate it; only another successful analysis enables recent-scenario persistence again.

Task content is stored as plaintext in the current browser origin. API keys, prompts, raw provider errors, and server configuration are never included.
The form discloses this automatic plaintext save before its submit button, while the result notice reports save success or failure and provides deletion.

## Interface locale contract

The single-page interface supports `ko`, `en`, and `ja`, with Korean as the server-rendered default.
The selected locale is stored independently under `frontier-workload-planner:locale`; it is not part
of recent-scenario schema v3 and does not trigger analysis, pricing, or allocation work. A valid
stored locale updates the interface and `<html lang>` after hydration. Invalid values and storage
failures are ignored without blocking the planner.

Buttons, headings, help, validation, status, accessibility labels, calculation warnings, and known
API error codes use typed locale copy. Model and provider names plus technical terms such as API,
JSON, Markdown, USD, tier, Low / Expected / High, Preview, and uncached text retain their precise
original form where appropriate. User-entered text and model-returned rationale or risk factors are
content, not interface copy, and are never machine-translated. Built-in samples follow the current
locale only when the user explicitly loads them.

## Export contract

Markdown copy and JSON export use the currently selected provider plan, including any valid local recalculation after analysis. Both include original task descriptions, analysis metadata, selected-provider Low / Expected / High results, task allocations, all three provider summaries, warnings, source URLs, verification date, price conditions, exclusions, and the heuristic/non-optimization disclaimer. Human-readable Markdown labels and explanations follow the current UI locale; user and GPT content remains unchanged.

JSON uses schema version 3 and an explicit allowlist projection rather than serializing application state wholesale. JSON keys, enums, and schema values are locale-independent. Its pricing snapshot records the three catalogs, provider-native invocation limits, limit sources, and verification dates used for the comparison, not a promise that those APIs were called. Both formats include selected provider, priority and active/held/infeasible status. Held and infeasible allocations use explicit `null` model/cost values; infeasible entries also preserve `no-compatible-offering` and the structured per-model scenario failures. Markdown uses em dashes instead of inventing a model or cost and prints the localized failure reasons. The filename uses only a UTC timestamp. Markdown escapes table delimiters, backslashes, and line breaks from user text. Clipboard rejection and file-generation errors are isolated to the export controls.

Exports contain task descriptions and leave the app through the clipboard or a local file. They never contain `OPENAI_API_KEY` or another server secret.

## OpenAI request policy

- API: Responses API
- Default model: `gpt-5.6`, overridable by `OPENAI_ANALYSIS_MODEL`
- Structured output: Zod through `zodTextFormat`
- Reasoning effort: `low`
- Output cap: 3,000 tokens
- Storage: `store: false`
- SDK retries: disabled
- Application attempts: two total, therefore one retry maximum
- Live gate: `ENABLE_LIVE_ANALYSIS` must equal `true`

## Error contract

Errors use `{ "ok": false, "error": { "code", "message", "details?" } }` and never include an API key, raw SDK error, prompt, or provider response body.

Expected codes include:

- `INVALID_JSON`, `INVALID_INPUT`, `REQUEST_TOO_LARGE`
- `LIVE_ANALYSIS_DISABLED`, `OPENAI_API_KEY_MISSING`
- `MODEL_REFUSAL`, `LIVE_ANALYSIS_FAILED`

Mock does not silently replace a failed Live request. The UI explains the failure and leaves Mock available so users can choose it explicitly.

## Supported use and limits

The schema covers software work, research, writing, data analysis, planning, creative, multimodal, and other tasks. It is an early planning estimate, not a quote or service guarantee.

Unsupported, unsafe, or severely underspecified tasks may be refused or classified as `other` with high uncertainty. Real token use depends on prompt context, files, tools, reasoning tokens, retries, provider tokenizers, and model behavior. This feature deliberately applies one GPT-produced size band across all catalogs rather than measuring Claude or Gemini usage. The deterministic engine exposes that fixed assumption but does not make the estimate a quote or guarantee.

## Security baseline

- The OpenAI key is read only in the Node.js Route Handler path.
- No secret uses a `NEXT_PUBLIC_` name.
- `.env*` files are ignored except `.env.example`.
- Live is off by default and never runs automatically.
- Request count, field lengths, body bytes, output tokens, timeout, and retries are bounded.
- The Route Handler counts actual streamed body bytes and cancels above 96 KiB instead of buffering an untrusted body first; `Content-Length` is only an early-rejection hint.
- Provider errors are sanitized before reaching the client.
- Browser persistence is versioned and validated before it reaches the calculation engine.
- Local persistence and exports contain no API key, raw provider error, or hidden prompt.

## Ver3 checkpoint 1 — Best-fit offering target (design only)

This section defines the next product contract; it does not describe functionality already shipped
or implemented on this branch. The reviewed API-only provider comparison remains frozen at tag
`provider-comparison-stable` (`d3edd98`). Checkpoint 1 changes only `SPEC.md`, `TASKS.md`, and
`DECISIONS.md`: no runtime type, GPT schema, catalog, calculation, storage, export, or UI contract
changes in this checkpoint.

> GPT-5.6 analyzes task requirements. A deterministic planner then allocates the least-waste route
> that satisfies the required planning quality from the user's available subscription and API
> options.

The target is not a model performance leaderboard. Quality is a minimum planning requirement, not
a value to maximize automatically. Tier alignment remains a planning heuristic, never an objective
benchmark, claim of cross-provider equivalence, or “best model” result. GPT-5.6 remains the only
analysis engine; Anthropic and Google APIs are not called.

### Resource and accounting contract

Ver3 supports two access modes: API and subscription. It keeps their resources in separate ledgers:

- **Expected API spend:** USD Low / Expected / High, calculated with the existing deterministic
  token and price engine.
- **Existing subscription use:** native credits, requests, a user-calibrated percentage, or an
  explicitly opaque limit. Included use has `$0` incremental cash cost while compatible capacity
  remains, but it still consumes scarce quota and therefore has opportunity cost.
- **New subscription commitment:** USD charged once for the plan, never once per task. It is shown
  separately from API spend and existing-subscription use.
- **Opportunity cost:** a descriptive non-cash signal. It is never added to API USD or presented as
  a precise exchange rate between quota and money.

The planner must not divide a monthly fee across tasks, add credits or requests to dollars, or infer
exact task capacity from a private or variable limit. A chat-only subscription cannot serve an
`ide-cli` or `batch` task. When a quota is uncertain, the route is conditional and receives an API
fallback rather than a guaranteed-capacity claim.

The target quota contract is:

```ts
type SubscriptionQuota =
  | { kind: "credits"; included: number; remaining: number }
  | { kind: "requests"; included: number; remaining: number }
  | {
      kind: "calibrated";
      remainingPercent: number;
      calibrationSource: "user-observed";
    }
  | { kind: "opaque"; description: string };
```

Numeric depletion is allowed only for a provider-published unit or an explicit user observation.
An opaque quota can be described as available, unavailable, or uncertain, but never converted to
“N tasks remaining.” Reset cadence, next reset date, supported surfaces, and overage availability
belong to the subscription resource rather than the model definition.

### Target model and offering separation

The current `ProviderModelPrice` intentionally remains the API-only compatibility source during the
transition. The future domain separates model identity from the route through which it is used:

```ts
type PlanningQualityTier = "economy" | "balanced" | "premium";

interface ModelDefinition {
  id: string;
  provider: string;
  family: string;
  qualityTier: PlanningQualityTier;
  capabilities: string[];
}

interface Offering {
  id: string;
  modelId?: string;
  mode: "api" | "subscription";
  supportedSurfaces: Array<"chat" | "ide-cli" | "batch">;
  sourceUrl: string;
  verifiedAt: string;
}
```

`ModelDefinition` owns identity, family, planning tier, capabilities, and a reference to invocation
limits. `Offering` owns the access mode, supported surfaces, availability conditions, and source.
API price schedules and subscription quota/resource state are separate types; neither is embedded
in calculation code. `modelId` stays optional because some subscription products do not publish a
fixed underlying model.

The existing machine value `frontier` remains unchanged in GPT output, LocalStorage v3, JSON v3,
Mock fixtures, and current UI. A future adapter may interpret that legacy planning position as
`premium`, but the names are not interchangeable until a versioned schema migration is implemented.
Likewise, the current `recommendedModelTier` is a heuristic recommendation, not the future hard
minimum `requiredQualityTier`.

Ver3 may let the user override the planning tier and standard text price only for a model already
present in the verified catalog. An override is source state, is visibly labeled user-supplied,
does not replace the official source snapshot, and can be restored to the verified default. It must
be persisted and exported with the default, override, provenance, and effective date needed to
reproduce the plan. Arbitrary API providers and models remain out of scope.

### Reuse and incremental transition contract

| Existing seam | Ver3 reuse and transition |
| --- | --- |
| `TaskInput`, `TaskAnalysis`, size bands, and iterations | Preserve as the stable analysis snapshot until the GPT contract receives its own versioned extension. |
| `PROVIDER_CATALOG` / `ProviderModelPrice` | Keep as the current API data source and adapt it into model definitions plus resolved API offerings; do not replace it in one rewrite. |
| `validateInvocationFeasibility` | Reuse the pure Low / Expected / High check, later accepting resolved invocation limits instead of a combined catalog object. |
| `estimateTaskCost` and micro-USD arithmetic | Reuse token and currency math; introduce a resolved-price input behind the existing provider/tier compatibility wrapper. |
| `allocateBudget` | Preserve deterministic priority, tie-breaking, compatible-tier, held, and infeasible rules as the API-only baseline. A new route orchestrator evaluates offerings above it. |
| `compareProviderPlans` | Retain as a regression adapter for the current three API families, not as the subscription engine. |
| source-only LocalStorage | Continue storing source choices rather than derived routes; migrate v3 only when available resources become runtime input. |
| allowlisted JSON and localized Markdown | Preserve projection and secret-safety rules; add a new result schema only when the result meaning actually expands. |

The staged migration order is: adapt the existing catalog to model/API-offering views; prove parity
with current provider plans; add subscription offering evaluation; add the combined Best-fit
orchestrator; then migrate UI, source persistence, and exports. The current API-only calculation and
`compareProviderPlans` must not be deleted or silently change meaning before parity tests pass.

LocalStorage v3 will later migrate to the next source-state version with no owned subscriptions and
the existing API selection preserved. JSON v3 remains the historical API-only result contract; a
new export version will be introduced instead of changing v3 in place. Derived plans and routes
remain recalculated rather than persisted.

### Future GPT analysis boundary

The existing Structured Output stays unchanged in checkpoint 1. A later version may add:

```ts
workMode: "interactive" | "coding-agent" | "batch";
requiredQualityTier: "economy" | "balanced" | "premium";
requiredCapabilities: string[];
upgradeConditions: string[];
failureRisk: "low" | "medium" | "high";
```

These fields describe workload requirements. GPT may judge reasoning needs, iteration count, size
bands, risk, work surface, capabilities, and minimum planning quality. It still must not calculate
token prices, translate subscription quota, compare providers, select an offering, or allocate the
final route.

The initial surface crosswalk is explicit: `interactive` requires `chat`, `coding-agent` requires
`ide-cli`, and `batch` requires `batch`. An offering is compatible only when its
`supportedSurfaces` contains the mapped surface. The planner cannot silently substitute another
surface; future multi-surface alternatives require an explicit schema and compatibility rule.

Once a hard minimum quality field exists, Cost Saver cannot choose below it. The current
`recommendedModelTier` and `strategyTargetTier` rules remain the API-only baseline until that
separate contract is introduced. The current global `deadlineDays` is reference-only and cannot
order tasks by deadline; task-level urgency must be explicit before a later allocator uses it.

### Future deterministic Best-fit contract

For each analysis snapshot, the future route engine will:

1. Remove surface-, capability-, and invocation-incompatible offerings.
2. Remove offerings below the explicit minimum planning quality.
3. Evaluate compatible, user-owned subscription routes without converting quota into USD.
4. Treat opaque or uncertain quota as conditional, not guaranteed capacity.
5. Calculate API Low / Expected / High ranges with the existing deterministic token engine.
6. Choose the minimum sufficient tier, then the least incremental-cash compatible route using a
   documented deterministic tie-break.
7. Preserve scarce subscription capacity for higher-priority and higher-loss work.
8. Provide an API alternative when subscription capacity is exhausted or uncertain.
9. Hold lower-priority work when neither compatible quota nor API budget is available.

Task priority remains the first allocation signal. Ver3 adds an optional user-owned task deadline;
the GPT analysis supplies the bounded `failureRisk` signal while the user-owned priority remains
authoritative. Scarce-resource reservation orders higher priority first, then earlier explicit
deadline (no deadline last), then higher failure risk, then stable input order. Budget relief and
holding use the inverse business-importance direction. The planner must not quietly reinterpret the
current global deadline to rank otherwise identical tasks.

The three target strategies are secondary policies applied only after the hard quality and
compatibility filters. Cost Saver selects the least incremental-cash sufficient route. Balanced
prefers a known-capacity route before applying cost tie-breaks. Quality First may add at most one
tier of headroom only when an explicit upgrade condition or failure-loss trigger applies and budget
or quota permits it. No strategy may cross below the minimum quality, treat opaque capacity as
guaranteed, or select premium merely because it is available.

A premium route is eligible only when a lower route misses the minimum requirement, the loss from
failure is explicitly high, the task requires complex reasoning or a large code change, or retry
risk threatens an explicit deadline. Results lead with the access route and include deterministic
`Best-fit route`, `Why this is enough`, `Why not premium`, `Upgrade trigger`, an alternative route,
and any hold reason. GPT does not generate cost or route-selection explanations.

`Avoided spend` compares executed tasks only against a disclosed, compatible all-premium API
counterfactual. Held or infeasible work cannot be counted as savings. The result is a planning
comparison, not realized savings or a claim that premium and lower-tier models perform equally.

The current standard-uncached API comparison remains a normalized reference view. Before an API
offering can become an executable Best-fit route, its effective date, token-range price conditions,
and invocation limits must apply to the workload. An excluded surcharge or expired introductory
rate cannot be treated as an available execution price merely because it remains useful in the
historical comparison baseline.

### Future input and result contract

The current task, budget, reference deadline, and strategy flow remains. Ver3 adds an optional
task-level deadline for deterministic ordering. A later `Available AI resources`
section adds API budget plus owned or candidate subscriptions, their remaining native quota, reset
information, supported surfaces, and a `Custom subscription` entry. Representative presets may
illustrate variable/opaque chat access, credit-based coding access, and rolling quota, but presets
must not invent unpublished capacity.

The result keeps three quantities visibly separate:

- Expected API spend
- Expected subscription usage in its native unit or honest uncertainty state
- Avoided spend versus the disclosed compatible all-premium API counterfactual

Any new subscription commitment is shown alongside, but not merged into, those quantities. Each
task leads with its recommended access route before the model name and includes the deterministic
explanations defined above.

The eventual Korean hero contract is:

```text
가장 비싼 모델보다,
작업에 맞는 선택을.

구독과 API를 함께 비교해 필요한 품질은 지키고
불필요한 비용과 한도 소모를 줄입니다.
```

English and Japanese use equivalent complete interface copy rather than mixed-language labels.
Technical terms and model/product names remain untranslated where precision requires it. The UI
will use an explicit Korean-capable font and avoid isolated heading line breaks. README, Devpost,
and video copy adopt this product definition only when the corresponding functionality exists.

### Phase and checkpoint boundary

The Ver3 target covers API and subscription offerings. ChatGPT-like variable subscriptions, credit-based
coding plans, rolling-quota plans, and `Custom subscription` are future presets or inputs, not
implemented checkpoint-1 features. A cloud subscription for a model family that can also run
locally is represented only as `Custom subscription`. This user-defined subscription metadata does
not authorize an arbitrary API provider, custom model catalog, or local-inference claim.

Self-hosted execution, local inference, GPU memory, throughput, electricity, and hardware
depreciation are Phase 2. “Local execution” must not appear as an implemented hero claim in Ver3.

The five accepted provider-comparison P2 findings remain a separate frozen backlog: date-aware
Sonnet 5 pricing, OpenAI's independent input cap, 320px provider-card readability, richer radio
descriptions, and locale-bound Markdown feedback. This design checkpoint neither fixes them nor
claims that `provider-comparison-stable` is P2-complete.

Checkpoint 1 is complete only when these three planning documents agree, the current API-only
behavior is still described accurately, the staged compatibility path is explicit, and no runtime
file or schema has changed.

## Deferred

- Arbitrary API providers or custom model catalog entries; `Custom subscription` metadata remains in the Ver3 target
- Direct Claude or Gemini API analysis
- Multiple saved scenarios
- CSV export
- A second chart
- Detailed time prediction
- Exhaustive search or complex optimization
- Pricing editor for the current provider-comparison baseline; Ver3 stages limited, labeled overrides for verified catalog entries
- Self-hosted inference, GPU sizing, electricity, throughput, and hardware-cost calculation (Phase 2)
