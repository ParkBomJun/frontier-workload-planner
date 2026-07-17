# Frontier Workload Planner — MVP Specification

Last updated: 2026-07-17

Internal target: 2026-07-21

## Product statement

Frontier Workload Planner turns up to eight task descriptions into an explainable, budget-aware recommended model plan. It does not claim to compute a mathematically optimal allocation.

## Fixed MVP scope

- One-page workflow with up to eight tasks
- One GPT-5.6 request for all tasks
- GPT recommends a model tier, never a concrete model or price
- Program maps tier to a fixed model and published pricing
- Deterministic Low / Expected / High cost calculation
- Expected-cost budget allocation and a High-cost risk warning
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

## Current implementation — checkpoint 2

This repository currently implements:

1. One to eight task names and descriptions in a single-page UI.
2. Budget, reference deadline, and planning-strategy controls.
3. Explicit Mock or Live submission to `POST /api/analyze`.
4. Server-side validation and one GPT-5.6 Responses API Structured Output for all tasks.
5. Fixed size-band conversion, published model prices, and deterministic Low / Expected / High costs.
6. Expected-cost budget allocation, High-cost warnings, task cards, and one cost chart.
7. Loading, success, input-error, configuration-error, and upstream-error states.

Checkpoint 3 adds one recent LocalStorage scenario, Markdown copy, JSON export, final responsive polish, and submission-ready documentation. Those features are intentionally absent from checkpoint 2.

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

GPT must not return final token counts, prices, costs, budget allocation, or completion time.

## Data contract

### Input

- `mode`: `mock | live`
- `tasks`: 1–8 items
- `tasks[].id`: 1–64 characters
- `tasks[].name`: 1–100 characters
- `tasks[].description`: 1–2,000 characters
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

| Tier | Model | Input / 1M tokens | Output / 1M tokens |
| --- | --- | ---: | ---: |
| `economy` | `gpt-5.6-luna` | $1.00 | $6.00 |
| `balanced` | `gpt-5.6-terra` | $2.50 | $15.00 |
| `frontier` | `gpt-5.6-sol` | $5.00 | $30.00 |

Cached-input discounts, cache-write premiums, tool charges, and retries outside the declared iteration estimate are not applied. The price source and `lastUpdated` value are displayed with results.

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
- Scenario cost: `(total input × input rate + total output × output rate) / 1,000,000`

Costs and budget comparisons are rounded to integer micro-USD before summing or comparing. Returned token values are scenario totals across all iterations.

## Budget allocation contract

Planning controls accept a budget from $0.01 through $10,000, a reference deadline from 1 to 90 days, and one strategy:

- `cost-saver`: begin one tier below GPT's recommendation, clamped at Economy
- `balanced`: begin at GPT's recommendation
- `quality-first`: begin one tier above GPT's recommendation, clamped at Frontier

If the initial Expected total exceeds the budget, lower one eligible task by one tier and recalculate until the plan fits or every task is Economy. The downgrade priority is deterministic: lower GPT-recommended tier, lighter reasoning, lower complexity, lower uncertainty, then earlier input order. The same task may be lowered again if it remains first in that ordering.

Uncertainty only protects higher-uncertainty work from earlier budget downgrades; it does not widen the numeric token bands. If even the all-Economy Expected total exceeds the budget, the plan remains over budget and shows the minimum-cost warning. High is compared after allocation and produces a risk warning only when it is strictly greater than the budget.

The deadline is reference information. It does not alter token estimates, costs, or assigned tiers, and this MVP does not claim detailed duration prediction.

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
- Provider errors are sanitized before reaching the client.

## Deferred

- Arbitrary custom models
- Multiple saved scenarios
- CSV export
- A second chart
- Detailed time prediction
- Exhaustive search or complex optimization
- Pricing editor UI until the core calculation flow works
