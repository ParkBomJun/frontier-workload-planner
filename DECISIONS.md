# Decision log

## 2026-07-17 — P0 implementation of the first-day scope

The P0 scope was originally planned for 2026-07-15. This log uses the actual implementation date from the workspace.

### Product language

Use **Budget-aware recommended plan**. Do not present the rule-based allocation as mathematical optimization.

### GPT / program boundary

GPT classifies task type, complexity, reasoning depth, iteration band, size bands, uncertainty, risks, and a model tier. It never supplies token numbers or cost. A later deterministic engine owns every numeric conversion and budget rule.

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
