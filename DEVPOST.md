# Devpost draft

## Title

Frontier Workload Planner

## Problem

Teams can describe AI work, but choosing an access route and planning incremental cash across APIs
and subscriptions is difficult. Asking a model to invent token counts, subscription quota, prices,
or an “optimal” answer makes the result hard to trust. Manual comparison is slow, and it often
mixes money already committed, new cash, native quota, and hypothetical savings into one misleading
number.

## Solution

Frontier Workload Planner analyzes up to eight tasks in one versioned structured GPT-5.6 request.
GPT returns bounded workload requirements—complexity, reasoning depth, size bands, work mode,
minimum planning quality, closed capability and upgrade codes, and failure risk—while users own
priority, date-only deadlines, failure impact, available-resource observations, and budget meaning.
GPT-5.6 is the only analysis engine. The app does not call Claude or Gemini APIs and never asks GPT
to select a provider, price, subscription, or final route.

A deterministic Best-fit planner evaluates eligible API and subscription candidates, checks every
Low / Expected / High invocation against provider-native limits, enforces the minimum-quality floor,
reserves native quota, deduplicates subscription commitment, calculates paid overage, and holds
lower-priority feasible work when incremental cash exceeds the confirmed budget. It leads with the
access route and keeps Expected API spend, subscription usage, new commitment, paid overage, and
avoided spend visibly separate. A structured fallback explains what happens when a preferred route
is conditional or unavailable.

The Economy / Balanced / Premium alignment is a planning heuristic, not an objective quality
ranking, capability equivalence claim, benchmark, quote, or “best model” recommendation. The
standard-text comparison excludes caching, discounted provider Batch processing, tool-call fees,
and long-context surcharges. A task whose `workMode` is `batch` can still use a compatible standard
API surface; that does not mean discounted Batch pricing was applied. Time-sensitive price windows,
Preview status, prompt tiers, and invocation limits stay visible in the catalog evidence.

## Honest evidence and override boundaries

The real ChatGPT-like, coding-plan, rolling-quota, and Custom presets are editable source hints, not
proof of access, capability, eligibility, quota, or consumption. They stay conditional or excluded
unless exact allowlisted evidence resolves. A test-only normalized allocator fixture can exercise a
confirmed subscription branch, but the video separates that code-path evidence from the product UI
and never presents it as a verified real account.

Official catalog defaults and user API overrides remain separate. An override can change only the
Best-fit planning tier and standard uncached text price for an exact existing catalog entry. It is
visibly user-supplied, affects only Best-fit candidates, cannot grant access or capability, and is
removed by “restore default.” The historical API-family compatibility comparison always uses the
official default.

## Reproducible without trusting a stale answer

One recent source-only scenario is stored in browser LocalStorage v6. It saves bounded raw resource
drafts, independent per-fact observation times, and exact user override source—not resolved
evidence, routes, ledgers, or savings. Frozen v1–v5 records migrate sequentially into v6 with an
empty Best-fit source state. On automatic or manual restore, the app re-resolves the source against
current preset, resource, and exact-version catalog resolvers and recalculates routes, quota, cash,
commitment, overage, and baseline. The restore instant, analysis time, confirmed-budget time,
resource observation times, and override recording times keep the planning/pricing clock monotonic;
the storage write time is not treated as calculation time.

Historical JSON v3/v4 comparison exports remain unchanged. Best-fit results use a separate
allowlisted JSON v5 document and parallel Korean, English, or Japanese Markdown. They include
structured primary/fallback/baseline routes, stable route keys, source state, planning/pricing
dates, and separated ledgers. Resolved resource and official-catalog snapshots are included only as
audit evidence with `purpose: "audit-only"` and `importAuthority: false`. Export audit is never
restore authority; source must be validated, re-resolved, and recalculated.

## Six demo outcomes

| Demo | What the viewer sees | Boundary kept visible |
| --- | --- | --- |
| Chat subscription | A separately shown test-only allocator fixture consumes native quota before avoidable API cash | It is not loaded into the UI; real presets remain conditional/excluded. |
| Coding route | A coding-agent task selects a compatible coding surface and shows a fallback | A product name never proves tool or access capability. |
| Batch API | Batch work uses a compatible standard API route | No discounted provider Batch price is applied. |
| Selective Premium | Only the tasks whose floor/closed trigger requires it upgrade | This is policy, not a model leaderboard. |
| Held work | Feasible lower-priority work is held at the cash boundary | Held and infeasible are different states. |
| Avoided spend | The selected plan is compared with a compatible all-Premium API baseline | It is a disclosed counterfactual, not cash received. |

The interface switches between Korean, English, and Japanese without another analysis request.
Human-readable Markdown follows the selected language; model names, technical identifiers, user
text, GPT rationale, and locale-neutral JSON values remain unchanged.

## Project links

- Stable live demo: <https://frontier-workload-planner.vercel.app>
- Source code: <https://github.com/ParkBomJun/frontier-workload-planner>

## Release and demo note

The public deployment intentionally keeps unauthenticated Live analysis disabled and contains no
OpenAI API key. A previous API-only contract validation completed through the server-side
`gpt-5.6` alias, but the Ver3 `best-fit-analysis-v2` contract still requires its own release
revalidation.

The public URL currently points to stable `main`. Ver3 and its LocalStorage v6 / Best-fit JSON v5
contracts are feature-branch work and must not be described as merged or deployed until release
verification, review, merge, and redeployment are complete.
