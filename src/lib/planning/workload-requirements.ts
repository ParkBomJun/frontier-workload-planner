import type {
  ModelTier,
  PlannerTaskAnalysis,
  TaskAnalysis,
  TaskInput,
} from "@/types/domain";
import type {
  OfferingEligibilityRequirement,
  OfferingTokenScenario,
} from "@/types/offerings";
import {
  APPLIED_UPGRADE_TRIGGER_CODES,
  WORK_MODE_TO_SURFACE,
  type AppliedUpgradeTrigger,
  type PlanningQualityTier,
  type WorkMode,
  type WorkSurface,
} from "@/types/workload";

const TIER_ORDER: readonly ModelTier[] = ["economy", "balanced", "frontier"];
const PLANNING_TO_LEGACY_TIER: Readonly<Record<PlanningQualityTier, ModelTier>> = {
  economy: "economy",
  balanced: "balanced",
  premium: "frontier",
};

export function isBestFitTaskAnalysis(
  analysis: PlannerTaskAnalysis,
): analysis is TaskAnalysis {
  return (
    "workMode" in analysis &&
    "requiredQualityTier" in analysis &&
    "requiredCapabilities" in analysis &&
    "upgradeConditions" in analysis &&
    "failureRisk" in analysis
  );
}

export function requiredSurfaceForWorkMode(workMode: WorkMode): WorkSurface {
  return WORK_MODE_TO_SURFACE[workMode];
}

export function supportsRequiredWorkSurface(
  workMode: WorkMode,
  supportedSurfaces: readonly WorkSurface[],
): boolean {
  return supportedSurfaces.includes(requiredSurfaceForWorkMode(workMode));
}

export function toOfferingEligibilityRequirement(
  analysis: TaskAnalysis,
  tokenScenarios: readonly OfferingTokenScenario[],
): OfferingEligibilityRequirement {
  return {
    surface: requiredSurfaceForWorkMode(analysis.workMode),
    minimumQualityTier: analysis.requiredQualityTier,
    requiredCapabilities: [...analysis.requiredCapabilities],
    tokenScenarios: tokenScenarios.map((scenario) => ({ ...scenario })),
  };
}

export function minimumLegacyTierForAnalysis(
  analysis: PlannerTaskAnalysis,
): ModelTier | null {
  return isBestFitTaskAnalysis(analysis)
    ? PLANNING_TO_LEGACY_TIER[analysis.requiredQualityTier]
    : null;
}

export function clampTierToAnalysisMinimum(
  tier: ModelTier,
  analysis: PlannerTaskAnalysis,
): ModelTier {
  const minimum = minimumLegacyTierForAnalysis(analysis);
  if (!minimum) return tier;
  return TIER_ORDER.indexOf(tier) < TIER_ORDER.indexOf(minimum) ? minimum : tier;
}

export function deriveAppliedUpgradeTriggers(
  task: TaskInput,
  analysis: TaskAnalysis,
): AppliedUpgradeTrigger[] {
  const triggers = new Set<AppliedUpgradeTrigger>(analysis.upgradeConditions);

  if (task.failureImpact === "high" && analysis.failureRisk !== "low") {
    triggers.add("high-failure-exposure");
  }
  if (task.deadlineDate !== null && analysis.failureRisk === "high") {
    triggers.add("deadline-retry-risk");
  }

  return APPLIED_UPGRADE_TRIGGER_CODES.filter((trigger) => triggers.has(trigger));
}
