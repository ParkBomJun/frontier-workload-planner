# Devpost draft

## Title

Frontier Workload Planner

## Problem

Teams can describe AI work, but turning those descriptions into a credible model choice and budget is difficult. Asking a model to invent token counts or claim a mathematically optimal allocation makes the result hard to trust, while manually comparing every task and price tier is slow and inconsistent.

## Solution

Frontier Workload Planner analyzes up to eight tasks in one structured GPT-5.6 request and asks the model only for bounded workload classifications such as complexity, reasoning depth, size bands, uncertainty, and a recommended tier. A deterministic engine then converts those classifications through fixed token ranges and published Luna, Terra, and Sol prices, calculates Low / Expected / High costs, and produces an explainable budget-aware recommended plan. A safe Mock mode demonstrates the complete flow without an API key, and users can restore one recent scenario or export the plan as Markdown and JSON.
