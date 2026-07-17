import { describe, expect, it } from "vitest";

import { createMockAnalysis } from "@/lib/ai/mock-response";
import { allocateBudget } from "@/lib/calculation/allocate-budget";
import { PLAN_JSON_SCHEMA_VERSION, createPlanJson } from "@/lib/export/json";
import { createPlanMarkdown } from "@/lib/export/markdown";
import type { PlanExportContext, TaskInput } from "@/types/domain";

const tasks: TaskInput[] = [
  {
    id: "task-1",
    name: "API | 설계\\검토",
    description: "첫 줄\n둘째 | 줄",
  },
  {
    id: "task-2",
    name: "출시 안내문",
    description: "사용자를 위한 안내문을 작성한다.",
  },
];
const plan = allocateBudget(tasks, createMockAnalysis(tasks).tasks, {
  budgetUsd: 5,
  deadlineDays: 7,
  strategy: "balanced",
});
const context: PlanExportContext = {
  sourceTasks: tasks,
  plan,
  analysisMode: "mock",
  analysisModel: "mock-fixture-v1",
  generatedAt: "2026-07-17T01:00:00.000Z",
};

describe("plan Markdown export", () => {
  it("includes every task, current plan, warnings, prices, and escaped user text", () => {
    const markdown = createPlanMarkdown(context);

    expect(markdown).toContain("API \\| 설계\\\\검토");
    expect(markdown).toContain("첫 줄<br>둘째 \\| 줄");
    expect(markdown).toContain("출시 안내문");
    expect(markdown).toContain(plan.tasks[0].modelId);
    expect(markdown).toContain("Low | Expected | High");
    expect(markdown).toContain("https://developers.openai.com/api/docs/pricing");
    expect(createPlanMarkdown(context)).toBe(markdown);
  });
});

describe("plan JSON export", () => {
  it("produces a parseable versioned projection with source descriptions and pricing", () => {
    const exportedAt = "2026-07-17T01:02:00.000Z";
    const json = createPlanJson(context, exportedAt);
    const parsed = JSON.parse(json) as Record<string, unknown>;

    expect(parsed).toMatchObject({
      schemaVersion: PLAN_JSON_SCHEMA_VERSION,
      exportedAt,
      product: "Frontier Workload Planner",
      analysis: {
        mode: "mock",
        model: "mock-fixture-v1",
        generatedAt: context.generatedAt,
      },
      input: {
        tasks,
        settings: plan.settings,
      },
      result: {
        totals: plan.totals,
        tasks: plan.tasks,
      },
      pricing: {
        lastUpdated: "2026-07-17",
        source: "https://developers.openai.com/api/docs/pricing",
        cacheDiscountApplied: false,
      },
    });
    expect(json).not.toContain("OPENAI_API_KEY");
    expect(json).not.toContain("NEXT_PUBLIC_");
  });
});
