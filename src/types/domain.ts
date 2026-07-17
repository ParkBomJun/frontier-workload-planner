import type {
  CapabilityId,
  FailureImpact,
  FailureRisk,
  PlanningQualityTier,
  UpgradeConditionCode,
  WorkMode,
} from "./workload";

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
export const PROVIDER_IDS = ["openai", "anthropic", "google"] as const;
export const PLANNING_STRATEGIES = ["cost-saver", "balanced", "quality-first"] as const;
export const TASK_PRIORITIES = ["high", "medium", "low"] as const;

export type TaskType = (typeof TASK_TYPES)[number];
export type Complexity = (typeof COMPLEXITY_LEVELS)[number];
export type ReasoningDepth = (typeof REASONING_DEPTHS)[number];
export type SizeBand = (typeof SIZE_BANDS)[number];
export type Uncertainty = (typeof UNCERTAINTY_LEVELS)[number];
export type ModelTier = (typeof MODEL_TIERS)[number];
export type ProviderId = (typeof PROVIDER_IDS)[number];
export type PlanningStrategy = (typeof PLANNING_STRATEGIES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export type AnalysisMode = "mock" | "live";
export type CostScenario = "low" | "expected" | "high";
export type InvocationLimitFailureCode =
  | "input-limit-exceeded"
  | "output-limit-exceeded"
  | "context-limit-exceeded";

export interface TaskInput {
  id: string;
  name: string;
  description: string;
  priority: TaskPriority;
  deadlineDate: string | null;
  failureImpact: FailureImpact;
}

export interface LegacyTaskAnalysis {
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

export interface TaskAnalysis extends LegacyTaskAnalysis {
  workMode: WorkMode;
  requiredQualityTier: PlanningQualityTier;
  requiredCapabilities: CapabilityId[];
  upgradeConditions: UpgradeConditionCode[];
  failureRisk: FailureRisk;
}

export type PlannerTaskAnalysis = LegacyTaskAnalysis | TaskAnalysis;

export interface AnalysisDocument {
  contractVersion: "best-fit-analysis-v2";
  tasks: TaskAnalysis[];
}
export type AnalysisDocumentV2 = AnalysisDocument;

export interface LegacyAnalysisDocument {
  tasks: LegacyTaskAnalysis[];
}

export interface AnalyzeSuccessResponse {
  ok: true;
  mode: AnalysisMode;
  model: string;
  generatedAt: string;
  analysis: AnalysisDocument;
}
export type AnalyzeSuccessResponseV2 = AnalyzeSuccessResponse;

export interface LegacyAnalyzeSuccessResponse {
  ok: true;
  mode: AnalysisMode;
  model: string;
  generatedAt: string;
  analysis: LegacyAnalysisDocument;
}

export type StoredAnalysisSnapshot =
  | {
      contractVersion: "api-analysis-v1";
      compatibility: "legacy-api-only";
      response: LegacyAnalyzeSuccessResponse;
    }
  | {
      contractVersion: "best-fit-analysis-v2";
      compatibility: "best-fit";
      response: AnalyzeSuccessResponse;
    };

type SnapshotContractIdentity<Snapshot extends StoredAnalysisSnapshot> =
  Snapshot extends StoredAnalysisSnapshot
    ? Pick<Snapshot, "contractVersion" | "compatibility">
    : never;

export type AnalysisContractIdentity = SnapshotContractIdentity<StoredAnalysisSnapshot>;

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

export interface InvocationTokenScenario {
  inputTokens: number;
  outputTokens: number;
}

export interface InvocationLimitFailure {
  code: InvocationLimitFailureCode;
  actualTokens: number;
  limitTokens: number;
}

export interface InvocationFeasibilityResult {
  feasible: boolean;
  tokenScenario: InvocationTokenScenario;
  failures: InvocationLimitFailure[];
}

export interface ScenarioInvocationFeasibility extends InvocationFeasibilityResult {
  scenario: CostScenario;
}

export interface OfferingFeasibilityFailure {
  tier: ModelTier;
  modelId: string;
  scenarios: ScenarioInvocationFeasibility[];
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
  analysis: PlannerTaskAnalysis;
  strategyTargetTier: ModelTier;
  offeringFailures: OfferingFeasibilityFailure[];
}

export interface ActivePlannedTask extends PlannedTaskBase {
  status: "active";
  assignedTier: ModelTier;
  modelId: string;
  cost: TaskCostEstimate;
  minimumExpectedCostUsd: number;
  wasDowngradedForBudget: boolean;
  wasReassignedForLimits: boolean;
}

export interface HeldPlannedTask extends PlannedTaskBase {
  status: "held";
  assignedTier: null;
  modelId: null;
  cost: null;
  minimumExpectedCostUsd: number;
  wasDowngradedForBudget: false;
  wasReassignedForLimits: false;
  holdReason: "insufficient-budget";
}

export interface InfeasiblePlannedTask extends PlannedTaskBase {
  status: "infeasible";
  assignedTier: null;
  modelId: null;
  cost: null;
  minimumExpectedCostUsd: null;
  wasDowngradedForBudget: false;
  wasReassignedForLimits: false;
  infeasibleReason: "no-compatible-offering";
}

export type PlannedTask = ActivePlannedTask | HeldPlannedTask | InfeasiblePlannedTask;

export interface BudgetAllocationPlan {
  providerId: ProviderId;
  settings: PlanningSettings;
  tasks: PlannedTask[];
  totals: CostTotals;
  minimumExpectedCostUsd: number | null;
  remainingBudgetUsd: number;
  expectedWithinBudget: boolean;
  highExceedsBudget: boolean;
  activeTaskCount: number;
  heldTaskCount: number;
  infeasibleTaskCount: number;
  downgradedTaskCount: number;
  limitReassignedTaskCount: number;
  warnings: string[];
}

export interface ProviderComparisonSummary {
  providerId: ProviderId;
  totals: CostTotals;
  expectedWithinBudget: boolean;
  allTasksActiveWithinBudget: boolean;
  highExceedsBudget: boolean;
  activeTaskCount: number;
  heldTaskCount: number;
  infeasibleTaskCount: number;
  downgradedTaskCount: number;
  limitReassignedTaskCount: number;
}

export interface PlanExportContext {
  sourceTasks: TaskInput[];
  plan: BudgetAllocationPlan;
  providerComparisons: ProviderComparisonSummary[];
  analysisMode: AnalysisMode;
  analysisModel: string;
  analysisContract: AnalysisContractIdentity;
  generatedAt: string;
}
