import type {
  CostScenario,
  PlanningStrategy,
  TaskAnalysis,
  TaskInput,
} from "./domain";
import type {
  ApiRouteIdentity,
  ConditionalAlternative,
  PlanningQualityTier,
  RouteIdentity,
  SubscriptionRouteIdentity,
} from "./offerings";
import type { AppliedUpgradeTrigger } from "./workload";

export const BEST_FIT_ROUTE_KINDS = [
  "owned-within-included-quota",
  "api",
  "owned-paid-overage",
  "new-subscription",
] as const;

export type BestFitRouteKind = (typeof BEST_FIT_ROUTE_KINDS)[number];
export type BestFitScenarioMicroUsd = Readonly<Record<CostScenario, number>>;
export type BestFitScenarioMicrounits = Readonly<Record<CostScenario, number>>;

export interface BestFitApiRouteCandidate {
  mode: "api";
  routeIdentity: ApiRouteIdentity;
  qualityTier: PlanningQualityTier;
  modelId: string;
  variableCashMicroUsd: BestFitScenarioMicroUsd;
}

export interface BestFitSubscriptionOverageProfile {
  rateUsdPerUnit: {
    coefficient: string;
    decimalScale: number;
  };
  maxOverageMicrounits: number | null;
}

export interface BestFitSubscriptionResourceProfile {
  routeIdentity: SubscriptionRouteIdentity;
  ownership: "owned" | "candidate-new";
  quotaUnit: "request" | "credit";
  availableMicrounits: number;
  fullPlanPeriodFeeMicroUsd: number;
  overage: BestFitSubscriptionOverageProfile | null;
}

export interface BestFitSubscriptionRouteCandidate {
  mode: "subscription";
  routeIdentity: SubscriptionRouteIdentity;
  qualityTier: PlanningQualityTier;
  modelId: string | null;
  resource: BestFitSubscriptionResourceProfile;
  demandMicrounits: BestFitScenarioMicrounits & {
    unit: "request" | "credit";
  };
}

export type BestFitConfirmedRouteCandidate =
  | BestFitApiRouteCandidate
  | BestFitSubscriptionRouteCandidate;

export interface NormalizedBestFitTask {
  task: TaskInput;
  analysis: TaskAnalysis;
  originalIndex: number;
  confirmedRoutes: readonly BestFitConfirmedRouteCandidate[];
  conditionalAlternatives: readonly ConditionalAlternative[];
}

export interface BestFitActiveTaskResult {
  status: "active";
  taskId: string;
  originalIndex: number;
  routeIdentity: RouteIdentity;
  routeKind: BestFitRouteKind;
  qualityTier: PlanningQualityTier;
  strategyTargetTier: PlanningQualityTier;
  variableCashMicroUsd: BestFitScenarioMicroUsd;
  appliedUpgradeTriggers: readonly AppliedUpgradeTrigger[];
  whyEnough:
    | "minimum-quality-met"
    | "higher-tier-saved-cash"
    | "quality-headroom-triggered"
    | "minimum-quality-requires-premium";
  whyNotPremium:
    | "premium-selected"
    | "premium-not-triggered"
    | "lower-tier-sufficient"
    | "no-compatible-premium-api";
  alternativeRouteIdentity: RouteIdentity | null;
  conditionalAlternatives: readonly ConditionalAlternative[];
}

export interface BestFitHeldTaskResult {
  status: "held";
  taskId: string;
  originalIndex: number;
  routeIdentity: null;
  strategyTargetTier: PlanningQualityTier;
  holdReason: "incremental-cash-budget-exhausted";
  appliedUpgradeTriggers: readonly AppliedUpgradeTrigger[];
  conditionalAlternatives: readonly ConditionalAlternative[];
}

export interface BestFitInfeasibleTaskResult {
  status: "infeasible";
  taskId: string;
  originalIndex: number;
  routeIdentity: null;
  strategyTargetTier: PlanningQualityTier;
  infeasibleReason: "no-compatible-confirmed-route";
  appliedUpgradeTriggers: readonly AppliedUpgradeTrigger[];
  conditionalAlternatives: readonly ConditionalAlternative[];
}

export type BestFitTaskResult =
  | BestFitActiveTaskResult
  | BestFitHeldTaskResult
  | BestFitInfeasibleTaskResult;

export interface BestFitPlanCash {
  lowMicroUsd: number;
  expectedMicroUsd: number;
  highMicroUsd: number;
  apiMicroUsd: BestFitScenarioMicroUsd;
  subscriptionFeeMicroUsd: number;
  paidOverageMicroUsd: BestFitScenarioMicroUsd;
  scenarioOverflow: Readonly<Record<CostScenario, boolean>>;
}

export interface BestFitPremiumBaselineTask {
  taskId: string;
  routeIdentity: ApiRouteIdentity;
  expectedCashMicroUsd: number;
}

export interface BestFitSpendComparison {
  premiumBaselineExpectedMicroUsd: number;
  selectedExpectedIncrementalCashMicroUsd: number;
  differenceMicroUsd: number;
  avoidedSpendMicroUsd: number;
  additionalSpendMicroUsd: number;
}

export interface BestFitAllocationPlan {
  contractVersion: "best-fit-plan-v1";
  strategy: PlanningStrategy;
  planningAsOf: string;
  pricingAsOf: string;
  incrementalCashBudgetMicroUsd: number;
  tasks: readonly BestFitTaskResult[];
  reservationOrderTaskIds: readonly string[];
  reliefOrderTaskIds: readonly string[];
  activatedSubscriptionRoutes: readonly SubscriptionRouteIdentity[];
  cash: BestFitPlanCash;
  expectedWithinBudget: boolean;
  highExceedsBudget: boolean;
  activeTaskCount: number;
  heldTaskCount: number;
  infeasibleTaskCount: number;
  premiumBaseline: readonly BestFitPremiumBaselineTask[] | null;
  spendComparison: BestFitSpendComparison | null;
  allocationMethod: "deterministic-add-one-subscription-heuristic";
}

export interface AllocateNormalizedBestFitPlanInput {
  tasks: readonly NormalizedBestFitTask[];
  strategy: PlanningStrategy;
  planningAsOf: string;
  pricingAsOf: string;
  incrementalCashBudgetMicroUsd: number;
}
