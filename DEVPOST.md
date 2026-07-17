# Devpost draft

## Title

Frontier Workload Planner

## Problem

Teams can describe AI work, but turning those descriptions into a credible model choice and budget is difficult. Asking a model to invent token counts or claim a mathematically optimal allocation makes the result hard to trust, while manually comparing every task and price tier is slow and inconsistent.

## Solution

Frontier Workload Planner analyzes up to eight tasks in one structured GPT-5.6 request and asks the model only for bounded workload classifications such as complexity, reasoning depth, size bands, uncertainty, and a recommended tier. GPT-5.6 remains the only analysis engine; the application does not call Claude or Gemini APIs. A deterministic engine projects the same classification through fixed token ranges and published standard uncached text prices for OpenAI GPT-5.6, Anthropic Claude, and Google Gemini product families. Before allocation, it validates every Low / Expected / High single invocation against each model's provider-native input, output, and combined context limits. It never truncates or automatically splits work. The engine calculates each provider's costs, budget fit, and active/held/infeasible task counts, then lets the user select a family and recalculate locally without another model request.

The Economy / Balanced / Frontier alignment is an explicit budget-planning heuristic, not an objective quality ranking, capability equivalence claim, benchmark, or “best model” recommendation. The comparison excludes caching, Batch or other discounted processing, tool-call fees, and long-context surcharges. It also exposes time-sensitive catalog facts: Claude Sonnet 5's introductory price is effective through August 31, 2026; Gemini 3.1 Flash-Lite is Stable while Gemini 3 Flash and Gemini 3.1 Pro are Preview; and the Gemini 3.1 Pro base price applies only to prompts up to 200K tokens. Incompatible tiers are excluded, and a task with no compatible offering is marked infeasible rather than budget-held. User priorities still control budget relief and held work. A safe Mock mode demonstrates the flow without an API key, and one recent scenario plus Markdown and versioned JSON exports preserve the selected provider and comparison context.

The interface can switch between Korean, English, and Japanese without another analysis request. Human-readable Markdown follows the selected language, while model names, technical terms, user text, GPT-provided rationale, and the locale-neutral JSON contract remain unchanged.

## Project links

- Live demo: <https://frontier-workload-planner.vercel.app>
- Source code: <https://github.com/ParkBomJun/frontier-workload-planner>

## Demo note

The public deployment intentionally keeps unauthenticated Live analysis disabled and does not contain an OpenAI API key. A separate local validation completed through the server-side `gpt-5.6` alias, returned `gpt-5.6-sol`, and passed the Structured Output schema contract.

The current public URL is still the stable `main` release. Provider comparison is being developed on `feature/provider-comparison` and must not be described as deployed until that branch passes release verification, review, merge, and redeployment.
