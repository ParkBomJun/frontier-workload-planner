# Task board

## P0 — minimum vertical slice

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

## July 16 first task

Define the deterministic size-band mapping and pricing source before adding UI:

1. Add `src/config/model-pricing.ts` with model IDs, input/output prices, source URL, and `lastUpdated`.
2. Add fixed `xs / s / m / l / xl` token ranges with documented assumptions.
3. Implement and test Low / Expected / High estimation without any GPT-provided token numbers.

## Later MVP work

- Budget allocation rules and High-cost warning
- Per-task cost bar chart
- One recent scenario in LocalStorage
- Markdown copy and JSON export
- Basic pricing override UI after the core calculation flow
- Public repository, Vercel environment configuration, and Devpost draft

## Explicitly deferred

- User-defined arbitrary models
- Multiple scenario management
- CSV export
- Second graph
- Detailed duration prediction
- Exhaustive or complex optimization
