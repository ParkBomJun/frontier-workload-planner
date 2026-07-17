import type { AnalysisDocument, TaskAnalysis, TaskInput } from "@/types/domain";

export const MOCK_TASK_ANALYSIS_FIXTURE: TaskAnalysis = {
  taskId: "task-1",
  taskType: "software-development",
  complexity: "medium",
  reasoningDepth: "moderate",
  expectedIterations: 2,
  estimatedInputSize: "m",
  estimatedOutputSize: "m",
  uncertainty: "medium",
  recommendedModelTier: "balanced",
  riskFactors: ["Acceptance criteria may change after the first implementation pass."],
  rationale:
    "A balanced tier fits a scoped implementation task that needs some reasoning and iteration. This is a mock fixture, not a live model judgment.",
};

export function createMockAnalysis(tasks: TaskInput[]): AnalysisDocument {
  return {
    tasks: tasks.map((task) => ({
      ...MOCK_TASK_ANALYSIS_FIXTURE,
      taskId: task.id,
    })),
  };
}
