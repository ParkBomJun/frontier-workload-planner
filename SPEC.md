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

## P0 vertical slice

This repository currently implements only:

1. One task name and description in the UI.
2. Explicit Mock or Live submission to `POST /api/analyze`.
3. Server-side validation and bounded request handling.
4. Mock fixture or one GPT-5.6 Responses API Structured Output.
5. Loading, success, input-error, configuration-error, and upstream-error states.
6. A simple result card with the structured fields.

No pricing, token mapping, budget allocation, charts, persistence, or export code belongs in P0.

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
- Entire JSON request: at most 20,000 UTF-8 bytes

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

Unsupported, unsafe, or severely underspecified tasks may be refused or classified as `other` with high uncertainty. Real token use depends on prompt context, files, tools, reasoning tokens, retries, and model behavior. Those values will be represented as visible assumptions when the deterministic engine is added.

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
