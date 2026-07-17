# Frontier Workload Planner — Ver3 demo script

Target length: 3–4 minutes

Recording status: feature-branch demo. Do not describe Ver3 as merged or deployed. The public URL
still serves stable `main`, and unauthenticated Live analysis remains disabled.

## Recording truthfulness rules

- Use deterministic Mock analysis for the product UI. If a confirmed subscription route is needed,
  show the test-only normalized allocator/export fixture as test evidence in the terminal or source;
  do not imply that the fixture can be loaded into the product UI. Keep the caption
  **“Deterministic test fixture — not a verified real account or production input.”**
- Real ChatGPT-like, coding-plan, rolling-quota, and Custom presets must remain visibly
  conditional/excluded unless their exact evidence resolves. Do not edit footage to imply otherwise.
- Say “Batch work mode on a compatible standard API route,” never “discounted Batch API.” The
  calculation excludes discounted provider Batch processing, caching, tool fees, and long-context
  surcharges.
- Call Economy / Balanced / Premium a planning heuristic. Do not call it an objective ranking,
  benchmark, provider equivalence, quote, optimization proof, or “best model.”
- Call avoided spend a compatible all-Premium API counterfactual, not money received.
- If any required outcome is not reachable from the current production-facing source inputs, show
  its focused deterministic test assertion as a separate evidence shot. Never fabricate or edit a
  product UI state to resemble that fixture.

## Shot list and narration

### 0:00–0:20 — Problem and contract

**Shot:** Open the Korean hero, then briefly switch to English and Japanese. Return to the demo
locale. Show tasks, incremental-cash budget, strategy, and Available AI resources without exposing
any secret or developer console.

**Narration:**

> Frontier Workload Planner turns up to eight task descriptions into an explainable access-route
> and budget plan. GPT-5.6 analyzes bounded workload requirements once. A deterministic planner—not
> GPT—checks quality floors, provider limits, subscription source, API prices, quota, and budget.

**Caption:** `GPT analyzes requirements · deterministic code selects and prices routes`

### 0:20–0:45 — Source and evidence boundary

**Shot:** Expand one real preset. Show the editable availability/quota/surface fields and its
conditional diagnostics. Open one API override, change a Best-fit price or tier, then point to the
official default and “restore default” action.

**Narration:**

> Presets and user observations are source hints, not provider proof. A real preset remains
> conditional until exact evidence resolves. API overrides are also separate user source: they
> affect only Best-fit and never rewrite the official catalog, access, capability, or limits.

**Caption:** `Official default ≠ user override · source ≠ authority`

### 0:45–1:05 — Demo 1: Chat subscription

**Shot:** First show the real Chat-like preset in the product UI remaining conditional. Then switch
to the focused allocator/export test and its fixture assertions, where one synthetic candidate uses
native quota before avoidable API cash. Keep the test-fixture disclosure on screen; do not present
the test object as a product account or UI-loaded scenario.

```bash
npm test -- --run tests/best-fit-export.test.ts
```

**Narration:**

> The real preset remains conditional. This separate deterministic test fixture exercises the
> allocator's confirmed-subscription branch: native quota is reserved before avoidable API cash.
> It is code-path evidence, not a product input or a claim that a real account was verified.

**Caption:** `1 · Chat subscription — test-only normalized allocator fixture`

### 1:05–1:25 — Demo 2: Coding route

**Shot:** Select a coding-agent task. Show its structured coding surface, route identity, and
fallback identity. If using a real preset rather than the fixture, keep it conditional.

**Narration:**

> A coding task can select a compatible coding surface and carry an explicit fallback. A product
> name alone never proves tool support or access, so unresolved production source stays conditional.

**Caption:** `2 · Coding route — surface and fallback stay explicit`

### 1:25–1:42 — Demo 3: Batch API

**Shot:** Show a task whose work mode is `batch` routed to a compatible standard API surface. Pause
on the pricing disclosure.

**Narration:**

> Batch here is the task's work surface. This plan uses standard uncached text pricing; it does not
> apply a provider's discounted Batch product, caching, tools, or long-context surcharges.

**Caption:** `3 · Batch work mode · standard API price`

### 1:42–2:02 — Demo 4: Selective Premium

**Shot:** Compare tasks with different minimum-quality floors or closed upgrade triggers. Show that
only the qualifying tasks move to Premium.

**Narration:**

> Premium is selective. The planner upgrades only where the minimum floor or a closed trigger
> requires it. This is a transparent planning policy, not a model leaderboard.

**Caption:** `4 · Selective Premium — floor and closed triggers only`

### 2:02–2:22 — Demo 5: Held work

**Shot:** Lower the incremental-cash budget until a feasible low-priority task becomes held. Keep an
excluded/infeasible example visible beside it if possible.

**Narration:**

> When cash is constrained, feasible lower-priority work is held deterministically. Held means
> deferred for budget. A task with no compatible route is separately infeasible; the UI never
> merges those outcomes.

**Caption:** `5 · Held ≠ infeasible`

### 2:22–2:42 — Demo 6: Avoided spend

**Shot:** Show the selected plan, compatible all-Premium API baseline, and avoided-spend value.
Point to unavailable rather than `$0` if the baseline cannot be constructed.

**Narration:**

> Avoided spend compares the complete selected plan with a disclosed compatible all-Premium API
> counterfactual. It is not cash received, and a missing compatible baseline remains unavailable
> instead of becoming a misleading zero.

**Caption:** `6 · Avoided spend — disclosed counterfactual`

### 2:42–3:15 — Save, restore, and recalculate

**Shot:** Edit one raw resource fact and one override, then show the automatic recent-scenario save.
Reload or use manual restore. Confirm that source returns, the current restore/pricing date does not
move backward, and routes/ledgers are recalculated.

**Narration:**

> LocalStorage v6 saves one recent source-only scenario: raw resource drafts, per-fact observation
> times, and exact override source. Frozen v1 through v5 records migrate with empty Best-fit source.
> Restore never trusts an old answer. It re-resolves current exact-version evidence and recalculates
> route, quota, commitment, overage, cash, and baseline with a monotonic calculation clock.

**Caption:** `LocalStorage v6 · raw source in · re-resolution and recalculation out`

### 3:15–3:40 — JSON v5 and Markdown

**Shot:** Export Best-fit JSON v5 and localized Markdown. Highlight the structured route/source
section, then the audit flags `purpose: "audit-only"` and `importAuthority: false`. Do not linger on
user descriptions longer than needed.

**Narration:**

> Best-fit has its own allowlisted JSON v5 and localized Markdown. They carry structured routes,
> restorable resource and override source, and resolved snapshots for audit. Audit is never restore
> authority; source must be validated, re-resolved, and recalculated. Historical JSON v3 and v4
> comparison contracts remain unchanged.

**Caption:** `Best-fit JSON v5 + Markdown · audit-only evidence is not authority`

### 3:40–3:55 — Close

**Shot:** Return to the separated cash/quota summary and feature-branch footer or README status.

**Narration:**

> The result is an explainable planning estimate, not a quote or guarantee. Ver3 is still
> feature-branch work; the stable public deployment has not yet been replaced by this build.

**Caption:** `Feature-branch demo · not yet the public deployment`

## Pre-recording checklist

- All six demo outcomes are visible and named.
- Fixture disclosure stays readable during confirmed subscription footage.
- A real preset is never shown as authoritative; the confirmed branch appears only as separately
  labeled test evidence.
- Official defaults and user overrides are both visible and distinct.
- Batch wording says standard API price, not discounted Batch processing.
- Held and infeasible states are shown separately.
- Avoided spend shows its baseline or an honest unavailable state.
- Restore demonstrates source re-resolution and a non-regressing pricing date.
- JSON v5/Markdown audit disclosure is readable.
- No API key, LocalStorage payload containing private task text, account identifier, or private URL
  appears in the recording.
