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
- User-owned High / Medium / Low priority, optional date-only deadline, and bounded failure impact for every task
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
The following provider-comparison and workload-contract extension belongs to
`feature/best-fit-offerings` and must not be described as deployed until it is verified, merged,
and redeployed:

1. One to eight task names, descriptions, user priorities, optional date-only deadlines, and bounded failure impacts in a single-page UI.
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
| Uncertainty, failure risk, and risk factors | Budget warnings and chart values |
| Recommended model tier and hard minimum planning quality | Currency formatting and totals |
| Work mode, required capabilities, and closed upgrade conditions | Work-mode/surface compatibility and deterministic trigger rules |
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
- `tasks[].deadlineDate`: nullable ISO calendar date (`YYYY-MM-DD`), with no time-zone conversion
- `tasks[].failureImpact`: `low | medium | high | unspecified`; new tasks start visibly at `medium`
- Entire JSON request: at most 96 KiB in UTF-8

Unknown keys are rejected.

### Structured GPT output v2

- `contractVersion`: exact document discriminator `best-fit-analysis-v2`

Per task:

- `taskId`: exact input ID
- `taskType`: `software-development | research | writing | data-analysis | planning | creative | multimodal | other`
- `complexity`: `low | medium | high | very-high`
- `reasoningDepth`: `light | moderate | deep`
- `expectedIterations`: integer 1–5
- `estimatedInputSize`: `xs | s | m | l | xl`
- `estimatedOutputSize`: `xs | s | m | l | xl`
- `uncertainty`: `low | medium | high`
- `recommendedModelTier`: `economy | balanced | frontier`
- `workMode`: `interactive | coding-agent | batch`
- `requiredQualityTier`: `economy | balanced | premium`
- `requiredCapabilities`: closed `CapabilityId[]`
- `upgradeConditions`: `deep-reasoning | large-code-change` values only
- `failureRisk`: `low | medium | high`
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
standard-price condition. The historical provider-comparison compatibility view still applies the
catalog's base `$2 / $12` planning rate and visibly discloses that the official `$4 / $18`
long-context tier is excluded. The checkpoint-4 generalized API evaluator instead returns a
`standard-price-input-limit-exceeded` conditional result with no cost whenever any Low / Expected /
High single invocation exceeds 200K; it never substitutes the excluded `$4 / $18` rate. Multiple
iterations increase scenario totals without changing the per-request price-condition check.

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

In the checkpoint-3 API-family allocator, `active`, `fit`, and “compatible tier” are deliberately
scoped to standard API price, the v2 minimum-quality floor, all Low / Expected / High invocation
limits, and the entered budget. The current provider catalog has `unknown` capability knowledge, so
this allocator does not yet enforce `workMode` surface or `requiredCapabilities`. `active` is a cost
projection, not confirmed Offering eligibility. UI, Markdown, and JSON v4 must preserve this
boundary. A legacy `api-analysis-v1` task has no minimum-quality floor; its infeasible explanation
must remain invocation-limit-only in UI, Markdown, and unchanged JSON v3 semantics.

## Budget allocation contract

Planning controls accept a budget from $0.01 through $10,000, a reference deadline from 1 to 90 days, and one strategy:

- `cost-saver`: begin one tier below GPT's recommendation, clamped at Economy
- `balanced`: begin at GPT's recommendation
- `quality-first`: begin one tier above GPT's recommendation, clamped at Frontier

For `best-fit-analysis-v2`, all three targets are additionally clamped at the hard
`requiredQualityTier` floor (`premium` maps to the legacy `frontier` catalog position). Neither
initial selection nor budget relief may cross below that floor. A restored `api-analysis-v1`
snapshot has no fabricated floor and retains the reviewed historical strategy behavior. The
trigger-bound final Quality First route policy remains checkpoint 6 work; this checkpoint only
protects the newly explicit minimum.

The engine builds a complete independent allocation for every provider from the same task and GPT
analysis snapshots. Selecting a product family only chooses which existing plan is displayed; it
does not call `/api/analyze` or a vendor API.

Within each provider, if the initial Expected total exceeds the budget, lower one eligible task to its next compatible lower tier and recalculate until the plan fits or no active task has a compatible lower tier. The budget-relief order is deterministic: lower user priority (`low`, then `medium`, then `high`), lower GPT-recommended tier, lighter reasoning, lower complexity, lower uncertainty, then earlier input order. The same task may be lowered again if it remains first in that ordering.

If every active task is already at its lowest compatible tier and its Expected total still exceeds the budget, move the first task in that same order to `held`, then restart the remaining active tasks from their compatible strategy targets. Repeat until active Expected cost fits. Held tasks remain visible in input order but receive no tier, model, or execution cost and are excluded from Low / Expected / High totals and the High warning. Increasing the budget recalculates from the same GPT analysis and can reactivate held work without another API request. It cannot make an `infeasible` task executable unless the task analysis or catalog limits change.

Uncertainty only protects higher-uncertainty work from earlier budget relief; it does not widen the numeric token bands. `minimumExpectedCostUsd` is the sum of each task's least expensive compatible Expected offering before budget holds and is `null` when any task has no compatible offering. High is compared after allocation for active tasks only and produces a risk warning only when it is strictly greater than the budget.

The deadline is reference information. It does not alter token estimates, costs, or assigned tiers, and this MVP does not claim detailed duration prediction.

## Recent scenario contract

The app keeps at most one recent successful scenario under the fixed browser key `frontier-workload-planner:recent-scenario`. A new successful analysis overwrites the previous record. A valid settings or provider-selection change updates the record without another GPT request.

Stored schema version 4 contains only:

- `schemaVersion` and `savedAt`
- `selectedProvider`: `openai | anthropic | google`
- submitted task names, descriptions, priorities, nullable `deadlineDate`, and bounded `failureImpact`
- valid budget, deadline, and strategy settings
- one discriminated `analysisSnapshot`: either unchanged `api-analysis-v1` / `legacy-api-only` data or a validated `best-fit-analysis-v2` / `best-fit` response

Derived provider comparisons and `BudgetAllocationPlan` objects are not stored. Restore validates the full schema, unique task IDs, and exact task/analysis order, then recalculates all provider plans with the current catalog and calculation rules. Restore never calls `/api/analyze` and never triggers Live analysis.

Historical v1/v2/v3 parsers are frozen and own their literal enums, limits, task, settings, response,
and analysis shapes without importing live schemas. Migration is sequential: v1 adds only the
approved `medium` priority, v2 adds only the approved OpenAI selection, and v3 wraps its response
unchanged as `legacy-api-only` while adding `deadlineDate: null` and `failureImpact: unspecified`.
No GPT-derived v2 field is invented. A legacy snapshot remains on the reviewed API-only planner
until the user explicitly runs Mock or Live analysis; restore itself never calls the API.

Malformed JSON or a record rejected by its own declared-version parser is removed. If historical
parsing succeeds but adaptation, target validation, or rewrite fails, the original bytes remain
untouched and the app returns a recoverable migration state; a validated in-memory migration still
loads when storage rewriting is blocked. An unknown future version is preserved but not loaded.
Storage access or quota errors remain non-blocking, and the user can explicitly delete the record.

Task content is stored as plaintext in the current browser origin. API keys, prompts, raw provider errors, and server configuration are never included.
The form discloses this automatic plaintext save before its submit button, while the result notice reports save success or failure and provides deletion.

## Interface locale contract

The single-page interface supports `ko`, `en`, and `ja`, with Korean as the server-rendered default.
The selected locale is stored independently under `frontier-workload-planner:locale`; it is not part
of recent-scenario schema v4 and does not trigger analysis, pricing, or allocation work. A valid
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

JSON uses an explicit allowlist projection rather than serializing application state wholesale.
Historical `api-analysis-v1` plans retain unchanged JSON schema version 3. A
`best-fit-analysis-v2` workload uses JSON schema version 4 so its task deadline, failure impact,
work mode, hard minimum quality, required capabilities, upgrade conditions, and failure risk are
not silently omitted. Markdown adds the same workload contract fields with localized labels.
JSON keys, enums, and schema values are locale-independent. Its pricing snapshot records the three
catalogs, provider-native invocation limits, limit sources, and verification dates used for the
comparison, not a promise that those APIs were called. Both formats include selected provider,
priority and active/held/infeasible status. Held and infeasible allocations use explicit `null`
model/cost values; infeasible entries also preserve `no-compatible-offering` and structured
per-model scenario failures. The filename uses only a UTC timestamp. Markdown escapes table
delimiters, backslashes, and line breaks from user text. Clipboard rejection and file-generation
errors are isolated to the export controls.

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

This section defines the staged Ver3 product contract. Checkpoints 2 through 5 now implement
passive adapters, the versioned workload/storage boundary, generalized API calculation, and the
internal subscription resource engine on this feature branch. They do not yet replace the live
API-family allocator or expose subscription input/results in the UI. The reviewed API-only
provider comparison remains frozen at tag `provider-comparison-stable` (`d3edd98`).

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

The target quota contract separates untrusted persisted evidence input, internally resolved
evidence, declared availability, quota shape, and a serializable consumption rule:

```ts
type AccessProviderId = string;

type StoredEvidenceInput =
  | {
      kind: "catalog-ref";
      catalogId: string;
      catalogVersion: string;
      entryId: string;
      claimId: string;
    }
  | {
      kind: "preset-ref";
      presetId: string;
      presetVersion: string;
      claimId: string;
    }
  | {
      kind: "connector-ref";
      adapterId: string;
      adapterVersion: string;
      bindingId: string;
      snapshotId: string;
      snapshotVersion: string;
    }
  | { kind: "user-observed"; observedAt: string; note: string };

declare const resolvedEvidenceAuthority: unique symbol;

type EvidenceRef =
  | {
      kind: "provider-published";
      authority: "allowlisted-registry-resolver";
      registryKind: "catalog" | "preset";
      registryId: string;
      registryVersion: string;
      entryId: string;
      claimId: string;
      sourceUrl: string;
      verifiedAt: string;
      readonly [resolvedEvidenceAuthority]: true;
    }
  | { kind: "user-observed"; observedAt: string; note: string }
  | {
      kind: "verified-connector-snapshot";
      authority: "verified-connector-resolver";
      adapterId: string;
      adapterVersion: string;
      bindingId: string;
      snapshotId: string;
      capturedAt: string;
      readonly [resolvedEvidenceAuthority]: true;
    };

type CapacitySnapshotEvidence = Extract<
  EvidenceRef,
  { kind: "user-observed" | "verified-connector-snapshot" }
>;

interface SourcedValue<T, E extends EvidenceRef = EvidenceRef> {
  value: T;
  evidence: E;
}

type Availability = {
  status: "available" | "unavailable" | "uncertain";
  evidence: EvidenceRef;
};

type ObservedRangeConsumptionRule = {
  kind: "observed-range-per-basis";
  unit: "request" | "credit" | "percent-point";
  basis: "task" | "analysis-iteration";
  low: number;
  expected: number;
  high: number;
  sampleSize: number;
  evidence: Extract<EvidenceRef, { kind: "user-observed" }>;
};

type ObservedPercentConsumptionRule = Omit<
  ObservedRangeConsumptionRule,
  "unit"
> & { unit: "percent-point" };

type ConsumptionRule =
  | {
      kind: "fixed-per-basis";
      unit: "request" | "credit";
      basis: "task" | "analysis-iteration";
      units: number;
      evidence: Extract<EvidenceRef, { kind: "provider-published" }>;
    }
  | ObservedRangeConsumptionRule;

type SubscriptionQuota =
  | {
      kind: "metered";
      unit: "request" | "credit";
      included: SourcedValue<number>;
      remaining: SourcedValue<number, CapacitySnapshotEvidence>;
      consumptionRule: ConsumptionRule;
    }
  | {
      kind: "calibrated";
      unit: "percent-point";
      remainingPercent: SourcedValue<number, CapacitySnapshotEvidence>;
      consumptionRule: ObservedPercentConsumptionRule;
    }
  | {
      kind: "initial-capacity";
      unit: "request" | "credit";
      included: SourcedValue<
        number,
        Extract<EvidenceRef, { kind: "provider-published" }>
      >;
      availableOnActivation: SourcedValue<
        number,
        Extract<EvidenceRef, { kind: "provider-published" }>
      >;
      appliesFor: "one-plan-period";
      consumptionRule: Extract<ConsumptionRule, { kind: "fixed-per-basis" }>;
    }
  | { kind: "opaque"; description: string; consumptionRule?: never };

type ResetPolicy =
  | { kind: "none" }
  | {
      kind: "fixed";
      cadenceDays: number;
      nextResetAt: string;
      evidence: EvidenceRef;
    }
  | { kind: "rolling"; windowHours: number; evidence: EvidenceRef }
  | { kind: "unknown" };

type OveragePolicy =
  | { kind: "none" }
  | {
      kind: "paid";
      unit: "request" | "credit" | "percent-point";
      usdPerUnit: number;
      appliesTo:
        | { kind: "whole-resource" }
        | {
            kind: "offering-list";
            offeringRefs: Array<{ providerId: AccessProviderId; offeringId: string }>;
          };
      effectiveFrom: string;
      effectiveThrough?: string;
      maxOverageUnits?: number;
      evidence: Extract<EvidenceRef, { kind: "provider-published" }>;
    }
  | { kind: "unknown" };

interface ResolvedSubscriptionResource {
  id: string;
  offeringRef: { providerId: AccessProviderId; offeringId: string };
  ownership: "owned" | "candidate-new";
  commitment:
    | {
        kind: "existing";
        currentFeeUsd: number;
        currency: "USD";
        billingBasis: "current-plan-period";
        evidence: EvidenceRef;
      }
    | {
        kind: "new";
        feeUsd: number;
        currency: "USD";
        billingBasis: "one-plan-period";
        evidence: EvidenceRef;
      };
  availability: Availability;
  quota: SubscriptionQuota;
  reset: ResetPolicy;
  overage: OveragePolicy;
}
```

`StoredEvidenceInput` is an untrusted claim accepted from UI state, LocalStorage, or import. A
separate `StoredSubscriptionResourceInput` uses that type at every evidence-bearing field;
`ResolvedSubscriptionResource` is never a persistence or request schema. `EvidenceRef` is an
internal resolved type and is never accepted by those parsers. Only the bundled
registry resolver can construct `provider-published`; it resolves an exact immutable catalog or
preset ID, version, entry, claim, subject, and field path from an allowlist. Historical registry
versions referenced by valid saved state remain available. A URL, date, official-looking domain,
or copied discriminator is not authority. User overrides are a separate user-supplied layer and
cannot replace the resolved source, limits, registry version, or evidence kind.

The authority brand and constructors are module-private. Runtime input schemas do not contain the
trusted variants, and calculation functions accept only resolver-produced model, Offering, and
subscription-resource objects. Type assertions or structurally similar JSON therefore cannot skip
the resolver boundary.

Likewise, `connector-ref` is only a pointer. The trusted connector resolver must validate an
allowlisted adapter and version, the authenticated user/account binding, the referenced resource
and Offering, snapshot schema/version, freshness and replay status, and a server receipt or
connector signature before constructing `verified-connector-snapshot`. A browser-supplied
connector ID, Origin header, URL, timestamp, or exported snapshot is insufficient. A deployment
without that authenticated backend cannot produce confirmed connector evidence, and secrets or
receipts are never persisted or exported.

Every restore re-resolves stored references rather than deserializing a trusted discriminator.
Unknown or mismatched registry versions, missing historical entries, invalid claim/subject binding,
uninstalled or offline connectors, account/resource mismatch, stale/replayed snapshots, and failed
receipts preserve the source record but resolve the dependent fact to unknown. The affected route
is conditional with a structured reason and compatible API fallback; this evidence alone cannot
confirm eligibility, quota, initial capacity, paid overage, active work, or all-tasks-active. Exported
resolved evidence is audit/display data only and cannot be imported as authority.

`ResetPolicy` is a sourced closed union for none, fixed cadence plus next reset, rolling window, or
unknown. It is display/validity metadata in Ver3: the planner never replenishes quota or predicts a
future reset. If a known reset boundary passes after the remaining-capacity snapshot, effective
availability becomes uncertain until the user or connector supplies a new snapshot. For a rolling
window, a snapshot older than `windowHours` is likewise uncertain.

`OveragePolicy` is none, a source-backed paid rate with explicit resource/offering scope, effective
dates, and optional cap, or unknown. The resolver checks the selected Offering, `pricingAsOf`,
native unit, deficit, and cap. Opaque quota plus paid overage is invalid because its threshold is
unknown. Missing applicability or an exceeded/unknown cap never becomes zero-cost capacity and
cannot confirm a route.

All numeric values must be finite. Metered included capacity is positive, remaining is between zero
and included, percent is between 0 and 100, consumption is positive with
`low <= expected <= high`, sample size is a positive integer, dates and URLs are validated, and
quota, consumption, and overage units must match. Included and remaining capacity retain separate
provenance; remaining/percentage always includes an observation or connector timestamp. Missing or
stale capacity evidence makes availability uncertain. Runtime validation rechecks these invariants
rather than trusting the TypeScript shape.

Every calculation receives one immutable `planningAsOf` timestamp. Snapshot freshness, reset
boundaries, and overage effective dates use that value rather than reading the clock during task
iteration. The timestamp and the separate catalog `pricingAsOf` date are exported so repeating the
same source state with the same as-of values is deterministic.

Ownership and commitment must agree: `owned` uses `existing`, while `candidate-new` uses a finite,
non-negative, evidenced USD `new` fee for exactly one plan period. A candidate with missing currency,
billing basis, fee evidence, or invalid amount is not an executable activation candidate. Existing
fees are informational sunk commitments; candidate-new fees enter plan cash only after activation.

Owned resources use timestamped metered/calibrated snapshots or opaque state. A candidate-new
resource can become confirmed only with resolver-issued provider-published `initial-capacity`
available immediately for the same plan period; `availableOnActivation` must be positive and no
greater than included capacity. Activation creates only a derived remaining ledger. A candidate
with no resolved official initial capacity stays opaque/conditional with an API fallback rather
than pretending that the full published allowance is currently available.

`estimateQuotaDemand(rule, analysis)` is pure and returns either a same-unit Low / Expected / High
range with provenance or `unknown` with a reason code. A task basis uses multiplier one; an
analysis-iteration basis uses the scenario iteration count. Missing rules, mismatched units, NaN,
Infinity, and opaque quotas never become zero demand.

Availability and demand resolve as follows:

- `unavailable` excludes the route.
- `available` plus resolver-issued provider-published demand that fits the remaining quota, or a
  deficit covered by resolved source-backed paid overage, can become a confirmed route; Expected
  demand drives reservation and High drives a risk warning.
- `uncertain`, user-observed/calibrated demand, or an opaque quota remains a conditional
  alternative. A numeric observed range may reserve High in a derived planning ledger to prevent
  duplicate suggestions, but that reservation never promotes the route to confirmed.
- Opaque quota is never numerically depleted and never becomes “N tasks remaining.”

Planning mutates only a derived ledger, never the saved source quota. Every conditional
subscription requires a surface/capability/limit-compatible API fallback. The guaranteed plan uses
the fallback's Expected cash for budget fit and its High cash for warning. If that fallback is over
budget, the task is held; if no compatible fallback exists, no guaranteed route exists and the task
is infeasible. Conditional alternatives alone cannot make an active count or all-tasks-active flag
true.

### Target model and offering separation

The current `ProviderModelPrice` intentionally remains the API-only compatibility source during the
transition. The future domain separates model identity from the route through which it is used:

```ts
type PlanningQualityTier = "economy" | "balanced" | "premium";

type CapabilityId =
  | "vision-input"
  | "file-input"
  | "code-editing"
  | "structured-output"
  | "tool-use";

interface InvocationLimits {
  maxInputTokens?: number;
  maxOutputTokens?: number;
  maxCombinedTokens?: number;
}

type SourcedInvocationLimits =
  | {
      knowledge: "complete";
      limits: InvocationLimits;
      evidence: EvidenceRef;
    }
  | {
      knowledge: "partial";
      limits: InvocationLimits;
      reason: string;
      evidence: EvidenceRef;
    }
  | { knowledge: "unknown"; reason: string; evidence?: EvidenceRef };

type SourcedCapabilityProfile =
  | {
      knowledge: "complete";
      capabilityIds: CapabilityId[];
      evidence: EvidenceRef;
    }
  | {
      knowledge: "partial";
      capabilityIds: CapabilityId[];
      reason: string;
      evidence: EvidenceRef;
    }
  | { knowledge: "unknown"; reason: string; evidence?: EvidenceRef };

type OfferingLimitPolicy =
  | {
      kind: "same-as-model";
      evidence: Extract<EvidenceRef, { kind: "provider-published" }>;
    }
  | { kind: "bounded"; invocationLimits: SourcedInvocationLimits }
  | { kind: "unknown"; evidence?: EvidenceRef };

type OfferingCapabilityPolicy =
  | {
      kind: "same-as-model";
      evidence: Extract<EvidenceRef, { kind: "provider-published" }>;
    }
  | {
      kind: "bounded";
      capabilityProfile: SourcedCapabilityProfile;
    }
  | { kind: "unknown"; evidence?: EvidenceRef };

interface ModelDefinition {
  id: string;
  modelProviderId: string;
  family: string;
  qualityTier: PlanningQualityTier;
  capabilityProfile: SourcedCapabilityProfile;
  invocationLimits: SourcedInvocationLimits;
}

type Offering =
  | {
      kind: "model-bound";
      id: string;
      providerId: AccessProviderId;
      mode: "api" | "subscription";
      modelId: string;
      supportedSurfaces: Array<"chat" | "ide-cli" | "batch">;
      limitPolicy: OfferingLimitPolicy;
      capabilityPolicy: OfferingCapabilityPolicy;
      evidence: EvidenceRef;
    }
  | {
      kind: "model-opaque-subscription";
      id: string;
      providerId: AccessProviderId;
      mode: "subscription";
      modelId?: never;
      supportedSurfaces: Array<"chat" | "ide-cli" | "batch">;
      eligibility:
        | {
            kind: "profiled";
            profile: EligibilityProfile;
            evidence: EvidenceRef;
          }
        | {
            kind: "unprofiled";
            reason: ModelOpaqueReasonCode;
            evidence?: EvidenceRef;
          };
      evidence: EvidenceRef;
    };

interface EligibilityProfile {
  qualityTier: PlanningQualityTier;
  capabilityIds: CapabilityId[];
  invocationLimits: SourcedInvocationLimits;
}

type ModelOpaqueReasonCode =
  | "model-undisclosed"
  | "quality-undocumented"
  | "capabilities-undocumented"
  | "limits-undocumented";

type RouteIdentity =
  | {
      providerId: AccessProviderId;
      offeringId: string;
      resourceId: null;
    }
  | {
      providerId: AccessProviderId;
      offeringId: string;
      resourceId: string;
    };

type ApiRouteIdentity = Extract<RouteIdentity, { resourceId: null }>;
type SubscriptionRouteIdentity = Extract<RouteIdentity, { resourceId: string }>;

type CanonicalRouteKey = readonly [AccessProviderId, string, string | null];

type ConditionalReasonCode =
  | "catalog-reference-unresolved"
  | "catalog-version-mismatch"
  | "catalog-claim-mismatch"
  | "preset-version-mismatch"
  | "connector-unverified"
  | "connector-binding-mismatch"
  | "connector-snapshot-stale"
  | "connector-snapshot-replayed"
  | "connector-receipt-invalid"
  | "evidence-authority-invalid"
  | "profile-unverified"
  | "model-limits-incomplete"
  | "access-limits-incomplete"
  | "model-capabilities-incomplete"
  | "access-capabilities-incomplete"
  | "availability-uncertain"
  | "consumption-user-observed"
  | "quota-calibrated"
  | "quota-opaque"
  | "quota-insufficient-observed"
  | "initial-capacity-unpublished";

type ConditionalAlternative = {
  routeIdentity: SubscriptionRouteIdentity;
  reasonCodes: readonly [ConditionalReasonCode, ...ConditionalReasonCode[]];
  fallbackRouteIdentity: ApiRouteIdentity;
};

type ConditionalFallbackFailureCode =
  | "no-compatible-api-fallback"
  | "fallback-over-incremental-cash-budget";
```

`ModelDefinition` owns model identity, family, planning tier, capabilities, and invocation limits.
`Offering.providerId` identifies the access provider and is required even when the model is opaque;
it is not inferred from `modelProviderId` because an access product can expose another company's
model. `Offering` otherwise owns access mode, supported surfaces, availability conditions, and
source. API price schedules and subscription quota/resource state are separate types; neither is
embedded in calculation code.

Access-provider, Offering, and resource IDs are immutable, locale-independent ASCII identifiers,
unique in their respective source-state scope, and never derived from a display label. Every API
or preset provider ID comes from its registry. Custom providers use only the planner-generated
`custom.<stable-id>` namespace and cannot claim a registered namespace; the stable suffix is not a
display label or raw user-entered provider name. Every API route uses
`resourceId: null`; every subscription route uses the non-empty stable ID of its resolved resource.
A resource's `offeringRef` must resolve to the same provider and Offering, and a duplicate
`(providerId, offeringId, resourceId)` tuple is a schema error.

`CanonicalRouteKey` is constructed structurally from `RouteIdentity`, never by delimiter joining.
Keys compare provider ID, Offering ID, then resource ID element by element in ascending code-point
order, with `null` before a string. This same structured identity is used by task assignments,
quota and fee ledgers, route and full-plan comparators, conditional alternatives, API fallbacks,
Premium baselines, and JSON/Markdown projection. Display names and model labels never break ties.

A model-bound offering must resolve its `modelId`; a missing reference is catalog-invalid and
ineligible. `same-as-model`, a narrower bounded policy, and unknown access policy are distinct—not
an optional field. Effective limits use the tighter intersection only when the model and access
policies both have complete resolver-issued provider-published knowledge. Effective capabilities
are the model capability set intersected with a complete bounded access-path profile, or the
complete model set under sourced `same-as-model`.

For limits, `complete` means that the evidence covers the full set of constraints applicable to
that model/surface; it does not require every optional numeric field to be present. Partial,
unknown, or user-observed model/access limits and capabilities cannot confirm eligibility. A
model-opaque subscription can be a confirmed eligibility candidate only when a complete
resolver-issued provider-published quality/capability/invocation-limit profile exists. A
user-observed profile is conditional, and an unprofiled product is only a conditional alternative.
The planner never fills an undisclosed profile from `recommendedModelTier`, a neighboring product,
an empty capability array, or guessed limits.

Eligibility is a closed union of `eligible`, `conditional` with non-empty
`ConditionalReasonCode[]` and `fallbackRequired: true`, or `ineligible` with closed reason codes.
Surface mismatch, a required capability missing from a complete profile, or a published
invocation-limit failure is ineligible. Undisclosed or user-observed eligibility is conditional.
Eligibility and quota availability must both be confirmed before a subscription can be the primary
execution route.

Conditional alternatives never enter the confirmed primary comparator and are not called optimal.
For diagnostic display they sort by primary `CanonicalRouteKey`, API fallback
`CanonicalRouteKey`, then a deduplicated reason-code vector using the declared enum order. The
resolver owns a versioned rank table in exactly the sequence shown above and never relies on union,
array, or object enumeration order. The fallback itself is selected by the confirmed API
comparator. Missing fallback becomes infeasible with `no-compatible-api-fallback`; a compatible
fallback that exceeds the incremental-cash budget becomes held with
`fallback-over-incremental-cash-budget`. These identities and codes are preserved unchanged in
task, plan, Markdown, and JSON results so enumeration order cannot choose a resource or rewrite an
explanation.

The legacy machine value `frontier` remains unchanged in `recommendedModelTier`, frozen
LocalStorage v1/v2/v3 responses, legacy JSON v3, Mock v2 fixtures, and current UI labels.
`requiredQualityTier` is a separate v2 hard floor using `premium`; it does not rename or reinterpret
the heuristic recommendation field. The deterministic compatibility mapping uses
`premium` → legacy catalog position `frontier` only where a floor must be enforced.

The checkpoint-2 Offering adapter remains passive. It preserves immutable, reference-independent v1 and v2
snapshots behind exact `(catalogId, catalogVersion)` lookup. The v1 canonical manifest has a fixed
SHA-256 golden; changing catalog facts requires a new snapshot version rather than editing a
published version. Evidence authority includes its exact catalog ID, version, entry, claim, subject,
field, and value, so equal values in two versions are not interchangeable. Legacy projection accepts
only a canonical provider/tier lookup and never caller-supplied resolved values. Checkpoint 3 adds
the workload contract and floor to the reviewed API-only allocator without promoting those adapted
Offerings into Best-fit routes. The provider-published
model identity claim does not contain the planner-authored
quality tier; a separately named resolver verifies the versioned `frontier` → `premium` heuristic
adapter. Because the current catalog contains no versioned capability claims, adapted
capability profiles remain `unknown`; model names are not evidence. Official model invocation
limits remain available, but the access policy stays `unknown` until a dedicated access-path claim
exists. Preset and connector references remain conditional until their allowlisted resolvers exist.

Ver3 may let the user override the planning tier and standard text price only for a model already
present in the verified catalog. An override is source state, is visibly labeled user-supplied,
does not replace the official source snapshot, and can be restored to the verified default. It must
be persisted and exported with the default, override, provenance, and effective date needed to
reproduce the plan. Arbitrary API providers and models remain out of scope.

### Reuse and incremental transition contract

| Existing seam | Ver3 reuse and transition |
| --- | --- |
| `TaskInput`, `TaskAnalysis`, size bands, and iterations | Checkpoint 3 adds the versioned workload extension while preserving the frozen v1 analysis shape for legacy API-only snapshots. |
| `PROVIDER_CATALOG` / `ProviderModelPrice` | Keep as the current API data source and adapt it into model definitions plus resolved API offerings; do not replace it in one rewrite. |
| `validateInvocationFeasibility` | Reuse the pure Low / Expected / High check, later accepting resolved invocation limits instead of a combined catalog object. |
| `estimateTaskCost` and micro-USD arithmetic | Reuse token and currency math; introduce a resolved-price input behind the existing provider/tier compatibility wrapper. |
| `allocateBudget` | Preserve deterministic priority, tie-breaking, compatible-tier, held, and infeasible rules as the API-only baseline. A new route orchestrator evaluates offerings above it. |
| `compareProviderPlans` | Retain as a regression adapter for the current three API families, not as the subscription engine. |
| source-only LocalStorage | Version 4 freezes v1/v2/v3 parsers and atomically stores either the legacy or v2 workload analysis snapshot. |
| allowlisted JSON and localized Markdown | Preserve projection and secret-safety rules; add a new result schema only when the result meaning actually expands. |

The staged migration order is: adapt the existing catalog to model/API-offering views; prove parity
with current provider plans; establish the storage safety gate; version the GPT/task contract and
storage snapshot atomically; add subscription offering evaluation; add the combined Best-fit
orchestrator; then migrate UI and exports. The current API-only calculation and
`compareProviderPlans` must not be deleted or silently change meaning before parity tests pass.

JSON v3 remains the historical API-only result contract. JSON v4 carries the expanded v2 workload
meaning without changing v3 in place. Derived plans and routes remain recalculated rather than
persisted.

### Storage-version safety gate

Checkpoint 3 owns the first Ver3 LocalStorage migration. It must land before or atomically with the
first `TaskInput` or GPT analysis contract change; persistence migration cannot wait until
checkpoint 8.

Storage parsers for versions 1, 2, and 3 are immutable historical contracts. Each owns its complete
task, settings, provider, response, analysis, enum, and length-limit schema. They must not import or
compose mutable live schemas such as `taskInputSchema`, `taskAnalysisSchema`,
`analysisDocumentSchema`, current provider/strategy enums, or the current success-response schema.

Storage version 4 uses an explicit analysis snapshot union:

```ts
type StoredAnalysisSnapshot =
  | {
      contractVersion: "api-analysis-v1";
      compatibility: "legacy-api-only";
      response: FrozenAnalyzeSuccessResponseV1;
    }
  | {
      contractVersion: "best-fit-analysis-v2";
      compatibility: "best-fit";
      response: AnalyzeSuccessResponseV2;
    };
```

Migration is sequential: v1 retains the approved Medium-priority adaptation into v2; v2 retains
the approved OpenAI selection into v3; v3 wraps its unchanged response as a `legacy-api-only`
snapshot in v4. Later source-state versions extend this chain. A legacy snapshot can
continue through the reviewed API-only planner, but it cannot enter Best-fit allocation until the
user explicitly requests a new Mock or Live analysis. Restore never triggers analysis itself.

Adapters must not synthesize `workMode`, `requiredQualityTier`, capabilities, upgrade signals,
`failureRisk`, or another GPT-derived value from a legacy tier, task type, free-form risk text,
empty array, or default. User-owned fields added later use an explicit legacy/unspecified state when
needed rather than pretending the user chose a value.

Future source-state records persist only `StoredEvidenceInput`, never branded `EvidenceRef` or a
resolved result snapshot. Restore re-runs the exact-version registry and connector resolvers before
calculation. Resolution failure preserves the reference and produces a recoverable conditional
state; it does not delete the scenario, trust exported provenance, or copy a claimed official kind
into the internal domain.

A valid historical record is removed only when its declared version's frozen parser proves that the
record itself is malformed. If historical parsing succeeds but adaptation, target validation, or
rewrite fails, the original bytes remain untouched and restore returns a recoverable
migration/reanalysis state. Unknown future versions also remain untouched. A migrated value replaces
the old value only after the entire target record validates; a write failure still permits in-memory
legacy restoration.

### Versioned GPT analysis boundary — checkpoint 3

Checkpoint 3 introduces `best-fit-analysis-v2` while retaining the frozen v1 response only inside
legacy snapshots. `AnalyzeSuccessResponseV2` keeps `ok`, `mode`, `model`, `generatedAt`, and an
analysis document containing the exact `contractVersion` plus the task array. Each v2 task adds:

```ts
type UpgradeConditionCode = "deep-reasoning" | "large-code-change";

type AppliedUpgradeTrigger =
  | "minimum-quality-requires-premium"
  | "high-failure-exposure"
  | "deadline-retry-risk"
  | UpgradeConditionCode;

workMode: "interactive" | "coding-agent" | "batch";
requiredQualityTier: "economy" | "balanced" | "premium";
requiredCapabilities: CapabilityId[];
upgradeConditions: UpgradeConditionCode[];
failureRisk: "low" | "medium" | "high";
```

These fields describe workload requirements. GPT may judge reasoning needs, iteration count, size
bands, risk, work surface, capabilities, and minimum planning quality. It still must not calculate
token prices, translate subscription quota, compare providers, select an offering, or allocate the
final route.

Checkpoint 3 records and displays work mode and required capabilities but does not claim that the
selected API-family model supports them. Until the Offering engine consumes a complete sourced
capability/surface profile, provider capability knowledge remains `unknown`; current active/fit
statuses cover only the v2 minimum-quality floor, invocation limits, standard-price cost, and
budget. JSON v4 exports this eligibility basis as machine-readable data, while legacy JSON v3 is
unchanged.

Capability and upgrade IDs are closed, versioned schema values. General text is a baseline rather
than a capability; coding-agent and batch are work modes; long-context eligibility comes from token
limits. Required capabilities must be a subset of the resolved eligibility profile. Unknown IDs
are rejected, and free-form `riskFactors` remain explanation-only.

The user separately owns `failureImpact: low | medium | high | unspecified`, which describes the
consequence of failure rather than GPT's estimated likelihood. Every new task initializes to a
visibly selected Medium; migrated legacy tasks use `unspecified` until the user confirms a value.
`deadlineDate` is either `null` or an ISO calendar date in `YYYY-MM-DD` form. It intentionally has
no time-of-day or time-zone conversion; new and migrated tasks begin with `null`. Checkpoint 3
exposes these two source fields in the existing task editor so the Medium default is visible, while
checkpoint 7 still owns their integration with the broader resource-input UI.
The program derives `high-failure-exposure` only from High impact plus non-Low risk, and
`deadline-retry-risk` only from an explicit task deadline plus High risk. It maps closed trigger
codes to stable program-owned meaning; later route explanations may localize those codes, while
free-form text never activates premium headroom.

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

1. Resolve a model definition or complete model-opaque eligibility profile.
2. Remove surface-, capability-, invocation-, and minimum-quality-incompatible offerings.
3. Resolve subscription availability and same-unit Low / Expected / High quota demand.
4. Keep uncertain, observed, or opaque subscription paths as conditional alternatives only.
5. Calculate compatible API Low / Expected / High ranges with the existing deterministic engine.
6. Build complete plans from owned subscriptions, API routes, and explicitly activated new
   subscriptions; never decide a shared monthly fee from one task in isolation.
7. Compare complete plans with the closed ordering below and reserve confirmed quota in task order.
8. Attach a compatible API fallback to every conditional subscription alternative.
9. Hold lower-priority work when confirmed quota plus incremental-cash budget cannot execute it.

Task priority remains the first allocation signal. Ver3 adds an optional user-owned task deadline;
the user also owns bounded `failureImpact`, while GPT supplies bounded `failureRisk`. Scarce-resource
reservation orders High / Medium / Low priority, earlier deadline with no deadline last, High /
Medium / Low / Unspecified impact, High / Medium / Low risk, then original input index ascending.
Budget relief and holding reverse each business-importance dimension—Unspecified impact and no
deadline first—but retain original input index ascending as the final stable tie-break. The planner
must not reinterpret the current global deadline or free-form risk text to rank tasks.

The three target strategies are secondary policies applied only after the hard quality and
compatibility filters. Cost Saver minimizes incremental cash among eligible routes and uses quality
excess only as an equal-cash tie-break. Balanced prefers minimum quality excess and then confirmed
owned included capacity before applying cash tie-breaks. Quality First may add at most one tier of
headroom only when a closed `AppliedUpgradeTrigger` exists and budget or quota permits it. No
strategy may cross below the minimum quality, treat conditional capacity as guaranteed, or select
Premium merely because it is available.

After hard filtering, if the minimum is below Premium, no compatible sub-Premium Offering remains,
and a compatible Premium Offering exists, the program emits
`minimum-quality-requires-premium`. This is the minimum sufficient compatibility fallback, not
Quality First headroom, and it permits Premium without another risk trigger. Premium is otherwise
eligible when the minimum itself is Premium or a closed trigger represents High failure exposure,
deep reasoning, a large code change, or deadline retry risk. Results lead with the access route and
include deterministic
`Best-fit route`, `Why this is enough`, `Why not premium`, `Upgrade trigger`, an alternative route,
and any hold reason. GPT does not generate cost or route-selection explanations.

For a fixed activated-subscription set, confirmed task routes use a complete lexicographic
comparator. Cost Saver sorts by Expected variable cash in micro-USD, `qualityKey`, route-kind rank,
then `CanonicalRouteKey`. Balanced sorts by `qualityKey`, capacity/cash class, Expected variable
cash, route-kind rank, then `CanonicalRouteKey`. Quality First first raises its target by at most one
tier when triggered, then uses Balanced ordering. Shared activation fees are excluded from the
per-route variable cash key and handled only at plan level. Different native quota units are never
converted for a tie-break; the full provider/Offering/resource tuple closes every remaining tie.
Conditional alternatives use their separate diagnostic ordering and never enter this confirmed
primary comparator.

The shared scalar definitions are:

```text
tierRank: economy=0, balanced=1, premium=2

qualityKey(route, target) = [
  max(0, targetRank - routeRank),
  max(0, routeRank - targetRank)
]

budgetFitRank: within=0, over=1
statusRank: active=0, held=1, infeasible=2
capacityCashClassRank: owned-within-included-quota=0, cash-bearing-route=1
routeKindRank:
  owned-within-included-quota=0,
  api=1,
  owned-paid-overage=2,
  new-subscription=3

expectedVariableCashMicroUsd =
  route Expected API cash + route Expected paid-overage delta
```

The first quality component penalizes a route below the strategy target; once at or above target,
the second prefers the smallest excess. The hard minimum-quality filter still runs first. All
scalar keys sort ascending, and task-status and quality-key vectors compare lexicographically in
the documented task order. Expected variable cash excludes only the shared subscription fixed fee,
which belongs to the full-plan comparator.

For Cost Saver, “minimum sufficient” is the hard eligibility floor rather than its first
optimization key. An eligible owned Balanced route at `$0` therefore beats a `$1` Economy API; at
equal cash, Economy wins through `qualityKey`. This does not maximize quality: an untriggered
Premium route is removed before comparison, and any selected higher eligible tier discloses that
cash was saved while scarce subscription quota was consumed.

An owned route that requires paid overage is cash-bearing and cannot outrank a cheaper API merely
because the base subscription is already owned. Within every complete plan, budget relief tries the
next confirmed compatible route in comparator order and recalculates all shared fees and overage
before it holds the task. Holding occurs only after no remaining confirmed assignment fits.

New subscription activation uses a deterministic plan-level heuristic rather than claiming a
global optimum. Start with owned subscriptions plus APIs. In each round, build a complete plan for
adding each one inactive subscription, remove unused activations, and accept only the strictly best
full-plan improvement. Repeat until none improves. Every strategy first compares `budgetFitRank`
and the `statusRank` vector in reservation order, so keeping more important work active beats a cash
saving. Cost Saver then compares Expected incremental cash, High incremental cash, and the
`qualityKey` vector. Balanced and Quality First compare the `qualityKey` vector, the
capacity/cash-class vector, Expected incremental cash, then High incremental cash. Every plan ends
with sorted canonical keys for activated subscription resources and the
`RouteIdentity | null` assignment vector in original task order; `null` sorts before a route key.
This catches a fee shared by several tasks without making task traversal decide the fee. It may miss
a combination that improves only when several subscriptions activate together, which must remain
disclosed as a heuristic limitation.

### Plan-level cash and budget contract

Ver3 introduces `incrementalCashBudgetUsd` as the versioned successor to current `budgetUsd`. It is
the maximum additional cash for the plan, not an API-only cap:

```text
activatedSubscriptionKeys =
  distinct CanonicalRouteKeys for new subscription resources used by active primary routes

planIncrementalCash[scenario] =
  active API spend[scenario]
  + full plan-period fee for each activatedSubscriptionKey
  + source-backed paid overage[scenario]

expectedWithinBudget =
  planIncrementalCash[Expected] <= incrementalCashBudgetUsd
```

A legacy `budgetUsd` value keeps its historical API-only meaning after restore. The checkpoint that
first persists `incrementalCashBudgetUsd` must introduce another atomic storage-version adapter and
show the restored amount as an unconfirmed legacy draft. Best-fit allocation may use it only after
the user explicitly confirms the broader total-incremental-cash meaning; cancellation leaves the
legacy API-only plan usable. Migration must not silently reinterpret or discard the old number.

The full monthly/plan-period fee appears once in Low, Expected, and High; it is not divided by task,
prorated, or projected across future renewals. A fee is absent when a subscription is unused,
fallback-only, or used only by held/infeasible tasks, and is removed when its final active primary
assignment disappears. Existing owned subscription fees are sunk commitments and excluded from
incremental cash, while their quota use remains visible. A conditional subscription does not
activate a fee; its guaranteed API fallback supplies the selected cash. Paid overage counts only
when unit, rate, applicability, and evidence are known.

Expected cash drives allocation and holds; High cash produces the risk warning. API spend, new
subscription commitment, paid overage, and existing subscription quota remain separate result
ledgers even though the first three are summed for the cash-budget boundary. Candidate routes and
subscription activations are compared through completed plans, so two $6 API tasks can correctly
prefer one applicable $10 subscription while one $6 task does not.

### Avoided-spend contract

Let `E` be exactly the active tasks in the guaranteed selected plan. If `E` is empty, the metric is
`null`. Otherwise, for each task in `E`, resolve
the compatible Premium API Offering with the lowest Expected micro-USD cost at the same
`pricingAsOf`; its API `CanonicalRouteKey` with `resourceId: null` breaks a cost tie. Compatibility
includes surface, capabilities, invocation limits, price date, and token-range conditions. If any
task in `E` lacks such an Offering, the premium baseline and avoided spend are `null` rather than
partial.

```text
premiumBaselineExpectedUsd =
  sum of each active task's resolved premium API Expected cost

selectedExpectedIncrementalCashUsd =
  planIncrementalCash[Expected]

differenceUsd =
  premiumBaselineExpectedUsd - selectedExpectedIncrementalCashUsd

avoidedSpendUsd = max(0, differenceUsd)
additionalSpendUsd = max(0, -differenceUsd)
```

Held and infeasible work is excluded from both sides. Conditional subscription suggestions use the
selected API fallback cost because they are not confirmed primary routes. Existing subscription
fees stay excluded as sunk commitments; new subscription fees and paid overage are deducted once
through selected incremental cash. A negative difference is shown as `additionalSpendUsd`, not
hidden behind `$0 saved`. Exports record the task set, structured baseline route identities and
costs, `pricingAsOf`, selected cash components, and both signed outcomes. The comparison is a
planning counterfactual, not realized savings or a claim that Premium objectively performs better.

The current standard-uncached API comparison remains a normalized reference view. Before an API
offering can become an executable Best-fit route, its effective date, token-range price conditions,
and invocation limits must apply to the workload. An excluded surcharge or expired introductory
rate cannot be treated as an available execution price merely because it remains useful in the
historical comparison baseline.

### Checkpoint-4 generalized API pricing and cost seam

Checkpoint 4 adds a separate pure calculation path without changing `estimateTaskCost`,
`allocateBudget`, or `compareProviderPlans` compatibility semantics. Every generalized evaluation
receives an explicit ISO `pricingAsOf`; no resolver reads the clock. It resolves the exact current
versioned catalog entry, selects the applicable official price period, checks each scenario's
single-invocation input against standard-price token conditions, and only then passes a normalized
rate into the shared size-band and iteration calculation. Costs use integer micro-USD rates and one
rounding step per complete scenario.

Claude Sonnet 5 resolves to `$2 / $10` through `2026-08-31` and `$3 / $15` from
`2026-09-01`. An invalid date, uncovered schedule period, or intentionally excluded price range
never falls back to the nearest known rate. Gemini 3.1 Pro above its 200K standard-price prompt
condition remains `conditional`, retains the excluded long-context rate only as diagnostic
metadata, and receives no executable cost. A published invocation-limit failure remains separately
`ineligible`. A successful `priced` result still sets `offeringEligibilityApplied: false`; price
and invocation resolution do not prove work-surface, capability, access-policy, or full Offering
eligibility.

An `ApiCatalogOverride` may reference only an exact allowlisted catalog ID, version, and existing
entry. Its provenance is always `user-supplied`; it may override only the planner-authored quality
tier and the two standard-text rate values from its explicit effective date. It cannot change model
identity, invocation limits, evidence, schedule coverage, token conditions, exclusions, Preview
state, or create a provider/model. Resolution returns the official default and provider-published
evidence beside the effective value. One-step restoration deletes the override source entry rather
than writing official values back as a user override. Checkpoint 7 owns the localized editor UI and
checkpoint 8 owns versioned persistence and export; checkpoint 4 does not mutate LocalStorage v4 or
JSON v3/v4.

### Checkpoint-5 subscription resource engine seam

Checkpoint 5 adds a strict internal `StoredSubscriptionResourceInput` parser and a separate
resolver-issued resource type. Stored input may contain only catalog/preset/connector references
or timestamped user observations; it cannot deserialize provider-published or connector authority.
Ownership and commitment are a discriminated contract: an owned resource carries an informational
existing fee, while a candidate resource carries one exact, safe micro-USD plan-period fee.
Provider, Offering, and resource IDs remain one canonical route tuple. Supported surfaces and
capabilities stay on the Offering eligibility contract rather than being duplicated as mutable
resource facts.

Quota supports metered requests/credits, observed percentage calibration, candidate initial
capacity, and deliberately opaque state. Numeric quota uses at most six decimal places and derived
integer microunits, so repeated fractional reservation does not depend on binary floating-point
rounding. Source quota and candidate plan-period fee decimals are converted exactly without
tolerance; only derived arithmetic may absorb ordinary IEEE-754 residue before becoming
microunits. Low / Expected / High
demand shares the workload iteration multipliers. Observed,
calibrated, opaque, incomplete, or unverified knowledge stays conditional. An insufficient observed
account does not hide a later usable account, and duplicate or mismatched route candidates are
rejected before deterministic canonical selection.

Resolution and every derived quota ledger are bound to the exact explicit `planningAsOf`. Crossing
a fixed or rolling reset boundary requires re-resolution; reset metadata never replenishes source
quota. Planning creates immutable derived ledgers only. The saved remaining amount is never
decremented. Expected confirmed demand is the reservation basis; observed conditional suggestions
reserve High when possible. Paid overage validates the exact provider claim value, route scope,
effective dates, unit, cumulative cap, and safe micro-USD cost. Opaque, unverified, expired,
out-of-scope, over-cap, or altered policies cannot provide capacity.

Eligibility, API cost, quota demand, resource resolution, resource, and derived-ledger objects must
be exact resolver/evaluator-issued values; structurally similar clones are rejected. Quota demand
is also bound to the task ID and demand-driving iteration count, while fallback eligibility and
pricing are bound to one canonical workload requirement and pricing date. A conditional
subscription suggestion accepts only a resolver-issued eligible API Offering paired with the exact
evaluated priced API route. Price alone is not compatibility. Current API adapters still have
unknown access/capability knowledge, so they do not become guaranteed fallbacks merely to exercise
a success test. Pure cash-boundary arithmetic is tested separately.

ChatGPT-like, Copilot-like, GLM-like, and Custom presets are non-authoritative input hints. They
contain no invented fee, quota, reset interval, or evidence. Connector code currently produces an
untrusted diagnostic after registered-adapter, authenticated binding, freshness, replay, and
receipt checks; no deployed backend evidence issuer exists. Likewise, the bundled registry has no
subscription consumption, initial-capacity, overage, or complete subscription-eligibility claim.
Consequently all currently constructible subscription routes remain conditional or unavailable;
the engine does not fabricate a confirmed positive path.

Existing subscription use and API spend remain separate ledgers. A commitment ledger records owned
use as zero incremental cash and deduplicates a selected candidate resource's full plan-period fee
once. This primitive does not choose which resource to activate. Checkpoint 6 still owns complete
plan construction, shared-fee comparison, cash-budget decisions, active/held status, and the final
Best-fit route comparator. Checkpoints 7 and 8 own UI and persistence/export integration, so
LocalStorage v4 and JSON v3/v4 are unchanged here.

### Future input and result contract

The current task, budget, reference deadline, and strategy flow remains. Ver3 adds an optional
task-level deadline, bounded failure impact, and the versioned incremental-cash budget. A later
`Available AI resources` section adds owned or candidate subscriptions, their remaining native
quota, reset information, supported surfaces, and a `Custom subscription` entry. Representative
presets may illustrate variable/opaque chat access, credit-based coding access, and rolling quota,
but presets must not invent unpublished capacity.

The result keeps four quantities visibly separate:

- Expected API spend
- Expected subscription usage in its native unit or honest uncertainty state
- New subscription commitment and paid overage
- Avoided spend versus the disclosed compatible all-premium API counterfactual

These remain separate line items. Only the explicitly labeled incremental-cash total combines API,
new-subscription, and paid-overage cash for the budget boundary. Each task leads with its
recommended access route before the model name and includes the deterministic explanations above.
Task, plan, fallback, baseline, and export records carry the same structured `RouteIdentity`; a
conditional result also carries its ordered reason codes and structured API fallback identity.

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

The Ver3 target covers API and subscription offerings. ChatGPT-like variable subscriptions,
credit-based coding plans, rolling-quota plans, and `Custom subscription` now exist only as
checkpoint-5 internal, non-authoritative preset metadata; their user-facing input is checkpoint 7.
A cloud subscription for a model family that can also run
locally is represented only as `Custom subscription`. This user-defined subscription metadata does
not authorize an arbitrary API provider, custom model catalog, local-inference claim, or
provider-published evidence. Unless its facts resolve through an allowlisted preset or verified
connector, a Custom subscription remains user-observed/unknown and therefore conditional.

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
