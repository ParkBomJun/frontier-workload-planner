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
| — | Per-provider totals, budget fit, and active/held counts |
| — | User priority, tier downgrades, and held-work selection |

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
| Google | `economy` | `gemini-3.1-flash-lite` | Gemini 3.1 Flash-Lite | $0.25 | $1.50 | preview |
| Google | `balanced` | `gemini-3-flash-preview` | Gemini 3 Flash | $0.50 | $3.00 | preview |
| Google | `frontier` | `gemini-3.1-pro-preview` | Gemini 3.1 Pro | $2.00 | $12.00 | preview; prompt ≤200K tokens |

Catalog sources:

- OpenAI pricing: <https://developers.openai.com/api/docs/pricing>
- OpenAI models: <https://developers.openai.com/api/docs/guides/latest-model>
- Anthropic pricing: <https://platform.claude.com/docs/en/about-claude/pricing>
- Anthropic models: <https://platform.claude.com/docs/en/about-claude/models/overview>
- Google pricing: <https://ai.google.dev/gemini-api/docs/pricing>
- Google models and preview status: <https://ai.google.dev/gemini-api/docs/gemini-3>

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

## Budget allocation contract

Planning controls accept a budget from $0.01 through $10,000, a reference deadline from 1 to 90 days, and one strategy:

- `cost-saver`: begin one tier below GPT's recommendation, clamped at Economy
- `balanced`: begin at GPT's recommendation
- `quality-first`: begin one tier above GPT's recommendation, clamped at Frontier

The engine builds a complete independent allocation for every provider from the same task and GPT
analysis snapshots. Selecting a product family only chooses which existing plan is displayed; it
does not call `/api/analyze` or a vendor API.

Within each provider, if the initial Expected total exceeds the budget, lower one eligible task by one tier and recalculate until the plan fits or every active task is Economy. The budget-relief order is deterministic: lower user priority (`low`, then `medium`, then `high`), lower GPT-recommended tier, lighter reasoning, lower complexity, lower uncertainty, then earlier input order. The same task may be lowered again if it remains first in that ordering.

If every active task is already Economy and its Expected total still exceeds the budget, move the first task in that same order to `held`, then restart the remaining active tasks from their strategy targets. Repeat until active Expected cost fits. Held tasks remain visible in input order but receive no tier, model, or execution cost and are excluded from Low / Expected / High totals and the High warning. Increasing the budget recalculates from the same GPT analysis and can reactivate held work without another API request.

Uncertainty only protects higher-uncertainty work from earlier budget relief; it does not widen the numeric token bands. `minimumExpectedCostUsd` remains the Economy Expected lower bound for running every submitted task before any holds. High is compared after allocation for active tasks only and produces a risk warning only when it is strictly greater than the budget.

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

JSON uses schema version 3 and an explicit allowlist projection rather than serializing application state wholesale. JSON keys, enums, and schema values are locale-independent. Its pricing snapshot records the three catalogs used for the comparison, not a promise that those APIs were called. Both formats include selected provider, priority and active/held status; held JSON allocations use explicit `null` values and Markdown uses em dashes instead of inventing a model or cost. The filename uses only a UTC timestamp. Markdown escapes table delimiters, backslashes, and line breaks from user text. Clipboard rejection and file-generation errors are isolated to the export controls.

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

## Deferred

- Arbitrary custom models
- Direct Claude or Gemini API analysis
- Multiple saved scenarios
- CSV export
- A second chart
- Detailed time prediction
- Exhaustive search or complex optimization
- Pricing editor UI; the feature branch uses the documented catalog and visible verification date
