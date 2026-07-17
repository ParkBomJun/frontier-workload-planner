# Task board

## Checkpoint 1 — minimum vertical slice

- [x] Initialize Next.js with TypeScript, App Router, Tailwind, `src/`, ESLint, and npm lockfile
- [x] Define the product boundary and replace “optimal allocation” with “budget-aware recommended plan”
- [x] Define bounded request and Structured Output Zod schemas
- [x] Implement server-only Mock/Live `POST /api/analyze`
- [x] Use Responses API with `gpt-5.6`, low reasoning, output cap, and one retry maximum
- [x] Implement one-task UI, sample loading, mode selection, and all basic request states
- [x] Add README, SPEC, decision log, environment example, and MIT license
- [x] Pass unit tests, lint, TypeScript, and production build
- [x] Verify Mock success, invalid input, disabled-Live failure, and mobile width
- [ ] Complete one real GPT-5.6 Structured Output call
- [x] Create the P0 checkpoint commit after local verification
- [ ] Publish GitHub repository and Vercel deployment

## Checkpoint 2 — core MVP

- [x] Add and remove up to eight tasks with stable task IDs
- [x] Add budget, reference deadline, and strategy inputs
- [x] Add official Luna / Terra / Sol standard-price configuration and source date
- [x] Convert GPT size bands through fixed per-iteration token ranges
- [x] Calculate deterministic Low / Expected / High token totals and costs
- [x] Compare and sum costs with integer micro-USD boundaries
- [x] Allocate model tiers against Expected cost with explainable downgrade rules
- [x] Warn when all-Economy Expected cost or allocated High cost exceeds budget
- [x] Render result summaries, task details, assumptions, and one Expected-cost chart
- [x] Test pricing order, size bands, scenarios, strategies, budget boundaries, ID validation, tie-breaking, and deadline independence
- [x] Pass full unit tests, lint, TypeScript, production build, API checks, and mobile-width smoke check
- [x] Create the checkpoint 2 review commit

## Checkpoint 3 — release candidate

- One recent scenario in LocalStorage
- Markdown copy and JSON export
- Final example data and responsive UI polish
- Empty, loading, and error-state release review
- Submission-ready README and deployed user flow
- Basic pricing override UI only if core release work is complete
- Public repository, Vercel environment configuration, and Devpost draft

## Explicitly deferred

- User-defined arbitrary models
- Multiple scenario management
- CSV export
- Second graph
- Detailed duration prediction
- Exhaustive or complex optimization
