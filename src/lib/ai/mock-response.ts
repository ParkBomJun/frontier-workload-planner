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

const MOCK_ANALYSIS_VARIANTS: Array<Omit<TaskAnalysis, "taskId">> = [
  MOCK_TASK_ANALYSIS_FIXTURE,
  {
    taskType: "research",
    complexity: "high",
    reasoningDepth: "deep",
    expectedIterations: 3,
    estimatedInputSize: "l",
    estimatedOutputSize: "m",
    uncertainty: "high",
    recommendedModelTier: "frontier",
    riskFactors: ["Source availability and recency can change the final comparison."],
    rationale:
      "A frontier tier fits research that requires synthesis across uncertain evidence. This is a mock fixture, not a live model judgment.",
  },
  {
    taskType: "writing",
    complexity: "low",
    reasoningDepth: "light",
    expectedIterations: 1,
    estimatedInputSize: "s",
    estimatedOutputSize: "s",
    uncertainty: "low",
    recommendedModelTier: "economy",
    riskFactors: [],
    rationale:
      "An economy tier fits a short, well-scoped writing task. This is a mock fixture, not a live model judgment.",
  },
];

export function createMockAnalysis(tasks: TaskInput[]): AnalysisDocument {
  return {
    tasks: tasks.map((task, index) => ({
      ...MOCK_ANALYSIS_VARIANTS[index % MOCK_ANALYSIS_VARIANTS.length],
      taskId: task.id,
    })),
  };
}
