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
