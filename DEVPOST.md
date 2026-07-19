# Devpost submission draft

## Title

Frontier Workload Planner

## Track

Apps for Your Life

## Tagline

Turn personal AI work, subscriptions, and API choices into an explainable budget plan.

## The problem

I may already pay for an AI subscription and still need an API for some work. Before starting a
project, it is hard to answer basic questions: Can the access method handle this task? Does my
existing plan help? What new cash might I spend? Which work should wait if my budget is limited?

Most comparisons mix money already committed, estimated API use, subscription quota, and
hypothetical savings. Asking a model to invent token counts, prices, or an "optimal" provider makes
the result even harder to trust.

## What I built

Frontier Workload Planner accepts up to eight tasks, their priority and risk, a total
incremental-cash budget, and optional observations about personal or organization-provided AI
subscriptions. Exact subscription credits are not required. Separate accounts can be recorded
independently, while concurrent limits on one account stay together so capacity is not double
counted. A user can first try a deterministic sample or explicitly analyze their own tasks with
GPT-5.6.

GPT-5.6 converts the task descriptions into one versioned structured workload document. It returns
bounded fields such as complexity, size band, work mode, minimum quality, required capabilities,
upgrade conditions, and failure risk. It never selects a provider, price, subscription, budget
action, or final route.

A deterministic TypeScript planner takes over from there. It resolves versioned catalog evidence,
checks invocation limits and minimum-quality floors, estimates Low / Expected / High standard-text
costs with integer micro-USD arithmetic, reserves confirmed quota, deduplicates a new subscription
commitment, and holds lower-priority work when the confirmed cash budget is insufficient. API cash,
subscription use, new commitment, and paid overage remain separate.

A changed budget must first be explicitly reconfirmed. Strategy, task priority, task deadline,
failure impact, and resource-observation changes then recalculate the plan locally without another
model call. Editing task names, descriptions, or the task list requires a new analysis. Results
explain why a route was chosen, what remains uncertain, what the fallback is, and what the user can
change next.

## The two design decisions that matter most

### Store source, not stale results

The browser stores one recent source-only scenario: user input, a versioned GPT analysis snapshot,
raw resource observations, and exact user override sources. It does not restore old routes, ledgers,
or savings as truth. Every restore validates those sources, re-resolves current versioned evidence,
and recalculates the plan.

Here, source includes the versioned workload analysis used as deterministic-planner input; it does
not mean only the original task text.

This decision also led to a memorable P1 fix. A restore sequence could move the calculation date
backward and apply an older price window. The final clock path merges every relevant analysis,
confirmation, observation, and restore time monotonically, including under React batching and a
delayed response.

### Let GPT classify; keep money in code

Natural-language workload analysis benefits from GPT-5.6. Financial meaning and route eligibility
need reproducible rules. Keeping provider, price, quota, and final-route decisions out of the model
makes plan changes instant, testable, and reviewable.

The app also refuses to turn a user's subscription guess into official proof. Unknown access or
quota stays conditional, and personal account billing, region, and permissions remain a separate
readiness check.

## How I used Codex

Codex was a continuing engineering collaborator throughout the build:

- It helped translate the written requirements into versioned Zod Structured Output, storage, and
  export contracts.
- It helped implement fixed-decimal estimation, deterministic allocation, stable tie-breaking,
  source-authority boundaries, and migration tests.
- It helped reproduce and fix the restore-clock P1 instead of hiding it behind a new saved result.
- I reviewed the app as an individual user, supplied screenshots and concrete UX objections, and
  used Codex to iterate on page length, plain-language labels, optional expert controls, blocking
  issue recovery, multilingual copy, and mobile layouts.
- Review findings became focused regression tests, followed by full unit, lint, TypeScript, build,
  and diff checks before each accepted checkpoint.

I made the final product decisions: the target audience, product name, source-only persistence,
bounded GPT role, strict evidence policy, UX direction, and what counted as an acceptable release.

## GPT-5.6 integration

The Live path calls GPT-5.6 through the server-side OpenAI Responses API with a versioned Zod
Structured Output contract, low reasoning, a bounded output budget, and at most one retry. The API
key never enters client code or browser storage. The free sample path uses a deterministic fixture
with the same contract shape, so judges can test planning without a key or usage cost.

## Privacy and honest boundaries

- The app discloses that one recent task scenario is saved in plaintext LocalStorage and lets the
  user delete it.
- The public sample creates its checked-in deterministic analysis entirely in the browser and does
  not send task text to the app server or an external AI.
- A private operator can explicitly enable Live analysis, which sends disclosed task text to OpenAI
  with Responses API `store: false`. API inputs are not used for training by default. Separate
  abuse-monitoring logs normally retain customer content for up to 30 days and may be kept longer
  when legally required or reasonably necessary to prevent harm; users are told not to enter
  sensitive content.
- Exports can contain task descriptions and must be reviewed before sharing.
- Public deployment keeps unauthenticated Live analysis disabled; the sample path remains free.
- Estimates use disclosed standard-text assumptions and are not quotes, benchmarks, objective model
  rankings, or mathematical optimization claims.
- Unverified subscription inputs remain conditional rather than becoming fabricated execution
  routes.

## Project links and release status

- Source: <https://github.com/ParkBomJun/frontier-workload-planner>
- Existing stable demo: <https://frontier-workload-planner.vercel.app>

The current release candidate is **not yet represented by the public URL**. This draft must not be
submitted until the exact candidate commit is public, that same commit is deployed, the production
sample flow is verified, one protected local GPT-5.6 call passes, and the remaining human gates in
`SUBMISSION_CHECKLIST.md` are complete.
