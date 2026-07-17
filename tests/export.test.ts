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
    priority: "high",
  },
  {
    id: "task-2",
    name: "출시 안내문",
    description: "사용자를 위한 안내문을 작성한다.",
    priority: "low",
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
const constrainedPlan = allocateBudget(tasks, createMockAnalysis(tasks).tasks, {
  budgetUsd: plan.tasks[0].minimumExpectedCostUsd,
  deadlineDays: 7,
  strategy: "balanced",
});
const constrainedContext: PlanExportContext = { ...context, plan: constrainedPlan };

describe("plan Markdown export", () => {
  it("includes every task, current plan, warnings, prices, and escaped user text", () => {
    const markdown = createPlanMarkdown(context);

    expect(markdown).toContain("API \\| 설계\\\\검토");
    expect(markdown).toContain("첫 줄<br>둘째 \\| 줄");
    expect(markdown).toContain("출시 안내문");
    expect(markdown).toContain(plan.tasks[0].modelId);
    expect(markdown).toContain("| high | Active |");
    expect(markdown).toContain("Low | Expected | High");
    expect(markdown).toContain("https://developers.openai.com/api/docs/pricing");
    expect(createPlanMarkdown(context)).toBe(markdown);
  });

  it("shows held priority and reason without inventing a model or execution cost", () => {
    const markdown = createPlanMarkdown(constrainedContext);

    expect(constrainedPlan.tasks.map((task) => task.status)).toEqual(["active", "held"]);
    expect(markdown).toContain("| low | On hold |");
    expect(markdown).toContain("| — | — | — | — |");
    expect(markdown).toContain("보류 사유:");
    expect(markdown).toContain("비용 합계는 실행 작업만 포함");
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

  it("exports held work as an explicit null allocation in schema v2", () => {
    const parsed = JSON.parse(createPlanJson(constrainedContext)) as {
      schemaVersion: number;
      result: {
        activeTaskCount: number;
        heldTaskCount: number;
        tasks: Array<{
          priority: string;
          status: string;
          assignedTier: string | null;
          modelId: string | null;
          cost: unknown;
          holdReason: string | null;
        }>;
      };
    };
    const held = parsed.result.tasks.find((task) => task.status === "held");

    expect(parsed.schemaVersion).toBe(2);
    expect(parsed.result).toMatchObject({ activeTaskCount: 1, heldTaskCount: 1 });
    expect(held).toMatchObject({
      priority: "low",
      assignedTier: null,
      modelId: null,
      cost: null,
      holdReason: "insufficient-budget",
    });
    expect(constrainedPlan.totals.expectedUsd).toBe(
      constrainedPlan.tasks[0].minimumExpectedCostUsd,
    );
  });
});
