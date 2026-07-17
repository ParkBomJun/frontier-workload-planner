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

### Price eligible GPT-5.6 input conservatively

The official Prompt Caching contract enables caching for requests with at least 1,024 input tokens and bills GPT-5.6 cache writes at 1.25× standard input. Apply the cache-write rate to all modeled input when a scenario's per-iteration input reaches that threshold. Continue to exclude cached-read discounts because the planner cannot guarantee an exact prefix hit. This intentionally raises some estimates and can change downgrade or held decisions; it is a correctness change, not a fourth optimization mode.

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
