export const TASK_TYPES = [
  "software-development",
  "research",
  "writing",
  "data-analysis",
  "planning",
  "creative",
  "multimodal",
  "other",
] as const;

export const COMPLEXITY_LEVELS = ["low", "medium", "high", "very-high"] as const;
export const REASONING_DEPTHS = ["light", "moderate", "deep"] as const;
export const SIZE_BANDS = ["xs", "s", "m", "l", "xl"] as const;
export const UNCERTAINTY_LEVELS = ["low", "medium", "high"] as const;
export const MODEL_TIERS = ["economy", "balanced", "frontier"] as const;
export const PLANNING_STRATEGIES = ["cost-saver", "balanced", "quality-first"] as const;
export const TASK_PRIORITIES = ["high", "medium", "low"] as const;

export type TaskType = (typeof TASK_TYPES)[number];
export type Complexity = (typeof COMPLEXITY_LEVELS)[number];
export type ReasoningDepth = (typeof REASONING_DEPTHS)[number];
export type SizeBand = (typeof SIZE_BANDS)[number];
export type Uncertainty = (typeof UNCERTAINTY_LEVELS)[number];
export type ModelTier = (typeof MODEL_TIERS)[number];
export type PlanningStrategy = (typeof PLANNING_STRATEGIES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export type AnalysisMode = "mock" | "live";

export interface TaskInput {
  id: string;
  name: string;
  description: string;
  priority: TaskPriority;
}

export interface TaskAnalysis {
  taskId: string;
  taskType: TaskType;
  complexity: Complexity;
  reasoningDepth: ReasoningDepth;
  expectedIterations: number;
  estimatedInputSize: SizeBand;
  estimatedOutputSize: SizeBand;
  uncertainty: Uncertainty;
  recommendedModelTier: ModelTier;
  riskFactors: string[];
  rationale: string;
}

export interface AnalysisDocument {
  tasks: TaskAnalysis[];
}

export interface AnalyzeSuccessResponse {
  ok: true;
  mode: AnalysisMode;
  model: string;
  generatedAt: string;
  analysis: AnalysisDocument;
}

export interface AnalyzeErrorResponse {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: Array<{ path: string; message: string }>;
  };
}

export type AnalyzeApiResponse = AnalyzeSuccessResponse | AnalyzeErrorResponse;

export interface PlanningSettings {
  budgetUsd: number;
  deadlineDays: number;
  strategy: PlanningStrategy;
}

export interface ScenarioEstimate {
  inputTokens: number;
  outputTokens: number;
  iterations: number;
  costUsd: number;
}

export interface TaskCostEstimate {
  low: ScenarioEstimate;
  expected: ScenarioEstimate;
  high: ScenarioEstimate;
}

export interface CostTotals {
  lowUsd: number;
  expectedUsd: number;
  highUsd: number;
}

interface PlannedTaskBase {
  taskId: string;
  taskName: string;
  priority: TaskPriority;
  analysis: TaskAnalysis;
  strategyTargetTier: ModelTier;
  minimumExpectedCostUsd: number;
}

export interface ActivePlannedTask extends PlannedTaskBase {
  status: "active";
  assignedTier: ModelTier;
  modelId: string;
  cost: TaskCostEstimate;
  wasDowngradedForBudget: boolean;
}

export interface HeldPlannedTask extends PlannedTaskBase {
  status: "held";
  assignedTier: null;
  modelId: null;
  cost: null;
  wasDowngradedForBudget: false;
  holdReason: "insufficient-budget";
}

export type PlannedTask = ActivePlannedTask | HeldPlannedTask;

export interface BudgetAllocationPlan {
  settings: PlanningSettings;
  tasks: PlannedTask[];
  totals: CostTotals;
  minimumExpectedCostUsd: number;
  remainingBudgetUsd: number;
  expectedWithinBudget: boolean;
  highExceedsBudget: boolean;
  activeTaskCount: number;
  heldTaskCount: number;
  downgradedTaskCount: number;
  warnings: string[];
}

export interface PlanExportContext {
  sourceTasks: TaskInput[];
  plan: BudgetAllocationPlan;
  analysisMode: AnalysisMode;
  analysisModel: string;
  generatedAt: string;
}
