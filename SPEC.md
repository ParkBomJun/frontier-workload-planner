# Frontier Workload Planner — MVP Specification

Last updated: 2026-07-17

Internal target: 2026-07-21

## Product statement

Frontier Workload Planner turns up to eight task descriptions into an explainable, budget-aware recommended model plan. It does not claim to compute a mathematically optimal allocation.

## Fixed MVP scope

- One-page workflow with up to eight tasks
- User-owned High / Medium / Low priority for every task
- One GPT-5.6 request for all tasks
- GPT recommends a model tier, never a concrete model or price
- Program maps tier to a fixed model and published pricing
- Deterministic Low / Expected / High cost calculation
- Expected-cost budget allocation, low-priority task holding, and a High-cost risk warning
- One per-task cost bar chart
- One recent scenario in LocalStorage
- Markdown copy and JSON export
- Mock and Live modes
- Server-only OpenAI API key

The tier mapping for the calculation stage is fixed as follows.

| GPT tier | Concrete model |
| --- | --- |
| `economy` | `gpt-5.6-luna` |
| `balanced` | `gpt-5.6-terra` |
| `frontier` | `gpt-5.6-sol` |

## Current implementation — release candidate

This repository currently implements:

1. One to eight task names, descriptions, and user priorities in a single-page UI.
2. Budget, reference deadline, and planning-strategy controls.
3. Explicit Mock or Live submission to `POST /api/analyze`.
4. Server-side validation and one GPT-5.6 Responses API Structured Output for all tasks.
5. Fixed size-band conversion, published model prices, and deterministic Low / Expected / High costs.
6. Priority-first Expected-cost allocation, explicit active/held work, High-cost warnings, task cards, and one cost chart.
7. One validated recent scenario in LocalStorage, restored without a new API request.
8. Markdown clipboard copy and versioned JSON export of the currently displayed plan.
9. Empty, loading, success, input-error, configuration-error, storage-error, and upstream-error states.

## Responsibility boundary

| GPT judgment | Deterministic program calculation |
| --- | --- |
| Task type | Tier → concrete model |
| Complexity | Size band → fixed token range |
| Reasoning depth | Model pricing lookup |
| Expected iterations (1–5) | Low / Expected / High cost |
| Input and output size bands | Budget-aware allocation rules |
| Uncertainty and risk factors | Budget warnings and chart values |
| Recommended model tier | Currency formatting and totals |
| — | User priority, tier downgrades, and held-work selection |

GPT must not return final token counts, prices, costs, budget allocation, or completion time.

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

### Standard model prices

Prices are fixed program data from the official OpenAI standard pricing table and were last checked on 2026-07-17.

| Tier | Model | Standard input / 1M | Cached read / 1M | Cache write / 1M | Output / 1M |
| --- | --- | ---: | ---: | ---: | ---: |
| `economy` | `gpt-5.6-luna` | $1.00 | $0.10 | $1.25 | $6.00 |
| `balanced` | `gpt-5.6-terra` | $2.50 | $0.25 | $3.125 | $15.00 |
| `frontier` | `gpt-5.6-sol` | $5.00 | $0.50 | $6.25 | $30.00 |

GPT-5.6 prompt caching is eligible at 1,024 input tokens per request and cache writes cost 1.25× standard input. For a conservative plan, every scenario whose per-iteration input reaches that threshold prices all input tokens at the cache-write rate. Below the threshold it uses the standard input rate. Cached-read discounts, tool charges, and retries outside the declared iteration estimate are not applied. The price and Prompt Caching sources plus `lastUpdated` are displayed with results.

### Token bands per iteration

| Band | Input Low / Expected / High | Output Low / Expected / High |
| --- | --- | --- |
| `xs` | 500 / 1,000 / 2,000 | 250 / 500 / 1,000 |
| `s` | 2,000 / 4,000 / 8,000 | 500 / 1,000 / 2,000 |
| `m` | 8,000 / 16,000 / 32,000 | 2,000 / 4,000 / 8,000 |
| `l` | 32,000 / 64,000 / 128,000 | 8,000 / 16,000 / 32,000 |
| `xl` | 128,000 / 192,000 / 256,000 | 32,000 / 64,000 / 96,000 |

The maximum input for any single iteration is 256K, below the current greater-than-272K long-context pricing boundary. Multiple iterations may make the scenario total larger without making any single request cross that boundary.

### Scenario formula

- Low iterations: `max(1, expectedIterations - 1)`
- Expected iterations: `expectedIterations`
- High iterations: `expectedIterations + 1`; this may be 6 because the schema's maximum of 5 describes the expected case, not an execution cap
- Scenario token totals: `per-iteration band value × scenario iterations`
- Scenario input rate: cache-write rate when the per-iteration input band is at least 1,024 tokens; otherwise standard input rate
- Scenario cost: `(total input × selected input rate + total output × output rate) / 1,000,000`

Costs and budget comparisons are rounded to integer micro-USD before summing or comparing. Returned token values are scenario totals across all iterations.

## Budget allocation contract

Planning controls accept a budget from $0.01 through $10,000, a reference deadline from 1 to 90 days, and one strategy:

- `cost-saver`: begin one tier below GPT's recommendation, clamped at Economy
- `balanced`: begin at GPT's recommendation
- `quality-first`: begin one tier above GPT's recommendation, clamped at Frontier

If the initial Expected total exceeds the budget, lower one eligible task by one tier and recalculate until the plan fits or every active task is Economy. The budget-relief order is deterministic: lower user priority (`low`, then `medium`, then `high`), lower GPT-recommended tier, lighter reasoning, lower complexity, lower uncertainty, then earlier input order. The same task may be lowered again if it remains first in that ordering.

If every active task is already Economy and its Expected total still exceeds the budget, move the first task in that same order to `held`, then restart the remaining active tasks from their strategy targets. Repeat until active Expected cost fits. Held tasks remain visible in input order but receive no tier, model, or execution cost and are excluded from Low / Expected / High totals and the High warning. Increasing the budget recalculates from the same GPT analysis and can reactivate held work without another API request.

Uncertainty only protects higher-uncertainty work from earlier budget relief; it does not widen the numeric token bands. `minimumExpectedCostUsd` remains the Economy Expected lower bound for running every submitted task before any holds. High is compared after allocation for active tasks only and produces a risk warning only when it is strictly greater than the budget.

The deadline is reference information. It does not alter token estimates, costs, or assigned tiers, and this MVP does not claim detailed duration prediction.

## Recent scenario contract

The app keeps at most one recent successful scenario under the fixed browser key `frontier-workload-planner:recent-scenario`. A new successful analysis overwrites the previous record. A valid settings change updates the record without another GPT request.

Stored schema version 2 contains only:

- `schemaVersion` and `savedAt`
- the submitted task names, descriptions, and priorities
- valid budget, deadline, and strategy settings
- the sanitized successful analysis response

The derived `BudgetAllocationPlan` is not stored. Restore validates the full schema, unique task IDs, and exact task/analysis order, then recalculates the plan with the current price table and calculation rules. Restore never calls `/api/analyze` and never triggers Live analysis.

Valid schema version 1 records are migrated explicitly by assigning `medium` priority to each task and are rewritten as version 2 on a best-effort basis. Malformed JSON or a damaged current-version record is ignored and removed. An unknown future schema version is preserved but not loaded. Storage access or quota errors remain non-blocking, and the user can explicitly delete the record. After deletion, settings-only edits do not recreate it; only another successful analysis enables recent-scenario persistence again.

Task content is stored as plaintext in the current browser origin. API keys, prompts, raw provider errors, and server configuration are never included.
The form discloses this automatic plaintext save before its submit button, while the result notice reports save success or failure and provides deletion.

## Export contract

Markdown copy and JSON export use the currently displayed plan, including any valid settings-only recalculation after analysis. Both include original task descriptions, analysis metadata, Low / Expected / High results, task allocations, warnings, price source, price date, and the non-optimization disclaimer.

JSON uses schema version 2 and an explicit allowlist projection rather than serializing application state wholesale. Both formats include priority and active/held status; held JSON allocations use explicit `null` values and Markdown uses em dashes instead of inventing a model or cost. The filename uses only a UTC timestamp. Markdown escapes table delimiters, backslashes, and line breaks from user text. Clipboard rejection and file-generation errors are isolated to the export controls.

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

Unsupported, unsafe, or severely underspecified tasks may be refused or classified as `other` with high uncertainty. Real token use depends on prompt context, files, tools, reasoning tokens, retries, and model behavior. The deterministic engine exposes its fixed assumptions but does not make the estimate a quote or guarantee.

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
- Multiple saved scenarios
- CSV export
- A second chart
- Detailed time prediction
- Exhaustive search or complex optimization
- Pricing editor UI; the release candidate uses the documented configuration file and visible `lastUpdated`
