import { describe, expect, it } from "vitest";

import { createMockAnalysis } from "@/lib/ai/mock-response";
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
};

describe("analyzeRequestSchema", () => {
  it("accepts a bounded mock request", () => {
    expect(analyzeRequestSchema.safeParse({ mode: "mock", tasks: [validTask] }).success).toBe(true);
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
    expect(analysisDocumentSchema.parse(analysis).tasks[0].taskId).toBe(validTask.id);
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
});
