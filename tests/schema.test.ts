import { describe, expect, it } from "vitest";

import {
  createMockAnalysis,
  MOCK_BATCH_TASK_ANALYSIS_FIXTURE,
} from "@/lib/ai/mock-response";
import { SAMPLE_TASKS_BY_LOCALE } from "@/data/examples";
import { buildAnalysisInput } from "@/lib/ai/prompt";
import {
  analysisDocumentSchema,
  analyzeRequestSchema,
  MAX_TASK_DESCRIPTION_LENGTH,
  taskAnalysisSchema,
} from "@/lib/ai/schema";

const validTask = {
  id: "task-1",
  name: "API 오류 처리 구현",
  description: "서버 요청의 오류 상태를 사용자에게 명확하게 표시한다.",
  priority: "medium" as const,
  deadlineDate: null,
  failureImpact: "medium" as const,
};

describe("analyzeRequestSchema", () => {
  it("accepts a bounded mock request", () => {
    expect(analyzeRequestSchema.safeParse({ mode: "mock", tasks: [validTask] }).success).toBe(true);
  });

  it("accepts every supported priority and rejects missing or unknown values", () => {
    for (const priority of ["high", "medium", "low"] as const) {
      expect(
        analyzeRequestSchema.safeParse({
          mode: "mock",
          tasks: [{ ...validTask, priority }],
        }).success,
      ).toBe(true);
    }

    const withoutPriority = {
      id: validTask.id,
      name: validTask.name,
      description: validTask.description,
      deadlineDate: validTask.deadlineDate,
      failureImpact: validTask.failureImpact,
    };
    expect(
      analyzeRequestSchema.safeParse({ mode: "mock", tasks: [withoutPriority] }).success,
    ).toBe(false);
    expect(
      analyzeRequestSchema.safeParse({
        mode: "mock",
        tasks: [{ ...validTask, priority: "urgent" }],
      }).success,
    ).toBe(false);
  });

  it("keeps user-owned planning metadata out of the GPT classification input", () => {
    const input = buildAnalysisInput([
      {
        ...validTask,
        priority: "high",
        deadlineDate: "2026-07-21",
        failureImpact: "high",
      },
    ]);

    expect(input).toContain('"id": "task-1"');
    expect(input).not.toContain('"priority"');
    expect(input).not.toContain('"deadlineDate"');
    expect(input).not.toContain('"failureImpact"');
  });

  it("accepts a nullable date-only deadline and bounded failure impact", () => {
    expect(
      analyzeRequestSchema.safeParse({
        mode: "mock",
        tasks: [{ ...validTask, deadlineDate: "2026-07-21", failureImpact: "high" }],
      }).success,
    ).toBe(true);
    expect(
      analyzeRequestSchema.safeParse({
        mode: "mock",
        tasks: [{ ...validTask, deadlineDate: "2026-07-21T12:00:00Z" }],
      }).success,
    ).toBe(false);
    expect(
      analyzeRequestSchema.safeParse({
        mode: "mock",
        tasks: [{ ...validTask, failureImpact: "critical" }],
      }).success,
    ).toBe(false);
  });

  it("rejects empty and oversized task input", () => {
    expect(analyzeRequestSchema.safeParse({ mode: "mock", tasks: [] }).success).toBe(false);
    expect(
      analyzeRequestSchema.safeParse({
        mode: "mock",
        tasks: [{ ...validTask, description: "x".repeat(MAX_TASK_DESCRIPTION_LENGTH + 1) }],
      }).success,
    ).toBe(false);
  });

  it("rejects more than eight tasks", () => {
    const tasks = Array.from({ length: 9 }, (_, index) => ({
      ...validTask,
      id: `task-${index + 1}`,
    }));
    expect(analyzeRequestSchema.safeParse({ mode: "live", tasks }).success).toBe(false);
  });

  it("rejects duplicate task identities", () => {
    expect(
      analyzeRequestSchema.safeParse({ mode: "mock", tasks: [validTask, { ...validTask }] }).success,
    ).toBe(false);
  });
});

describe("structured analysis schema", () => {
  it("accepts the mock fixture and preserves task identity", () => {
    const analysis = createMockAnalysis([validTask]);
    expect(analysis.contractVersion).toBe("best-fit-analysis-v2");
    expect(analysisDocumentSchema.parse(analysis).tasks[0].taskId).toBe(validTask.id);
  });

  it("pairs the third product sample with an explicit Batch analysis fixture", () => {
    const analysis = createMockAnalysis(SAMPLE_TASKS_BY_LOCALE.en);

    expect(taskAnalysisSchema.parse(MOCK_BATCH_TASK_ANALYSIS_FIXTURE)).toMatchObject({
      taskType: "data-analysis",
      workMode: "batch",
      requiredCapabilities: ["structured-output"],
    });
    expect(analysis.tasks[2]).toMatchObject({
      taskId: "task-3",
      taskType: "data-analysis",
      workMode: "batch",
      requiredCapabilities: ["structured-output"],
    });
    expect(SAMPLE_TASKS_BY_LOCALE.ko[2]?.description).toContain("무인 배치");
    expect(SAMPLE_TASKS_BY_LOCALE.en[2]?.description).toContain(
      "unattended batch",
    );
    expect(SAMPLE_TASKS_BY_LOCALE.ja[2]?.description).toContain("無人バッチ");
  });

  it("rejects invented numeric estimates and more than three risks", () => {
    const valid = createMockAnalysis([validTask]).tasks[0];
    expect(
      taskAnalysisSchema.safeParse({
        ...valid,
        estimatedInputSize: 4_000,
        riskFactors: ["one", "two", "three", "four"],
      }).success,
    ).toBe(false);
  });

  it("rejects missing versions, unknown workload codes, and route or price decisions", () => {
    const validDocument = createMockAnalysis([validTask]);
    const valid = validDocument.tasks[0];

    expect(
      analysisDocumentSchema.safeParse({ tasks: validDocument.tasks }).success,
    ).toBe(false);
    expect(
      taskAnalysisSchema.safeParse({ ...valid, requiredCapabilities: ["web-search"] }).success,
    ).toBe(false);
    expect(taskAnalysisSchema.safeParse({ ...valid, workMode: "agent" }).success).toBe(false);
    expect(
      taskAnalysisSchema.safeParse({ ...valid, requiredQualityTier: "frontier" }).success,
    ).toBe(false);
    expect(
      taskAnalysisSchema.safeParse({ ...valid, upgradeConditions: ["use-premium"] }).success,
    ).toBe(false);
    expect(taskAnalysisSchema.safeParse({ ...valid, failureRisk: "critical" }).success).toBe(
      false,
    );
    expect(
      taskAnalysisSchema.safeParse({ ...valid, providerId: "openai" }).success,
    ).toBe(false);
    expect(
      taskAnalysisSchema.safeParse({ ...valid, expectedCostUsd: 1 }).success,
    ).toBe(false);
  });
});
