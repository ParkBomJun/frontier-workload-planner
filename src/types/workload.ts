export const WORKLOAD_ANALYSIS_CONTRACT_VERSION = "best-fit-analysis-v2" as const;

export const PLANNING_QUALITY_TIERS = ["economy", "balanced", "premium"] as const;
export const CAPABILITY_IDS = [
  "vision-input",
  "file-input",
  "code-editing",
  "structured-output",
  "tool-use",
] as const;
export const WORK_MODES = ["interactive", "coding-agent", "batch"] as const;
export const WORK_SURFACES = ["chat", "ide-cli", "batch"] as const;
export const FAILURE_RISKS = ["low", "medium", "high"] as const;
export const FAILURE_IMPACTS = ["low", "medium", "high", "unspecified"] as const;
export const UPGRADE_CONDITION_CODES = ["deep-reasoning", "large-code-change"] as const;
export const APPLIED_UPGRADE_TRIGGER_CODES = [
  "minimum-quality-requires-premium",
  "high-failure-exposure",
  "deadline-retry-risk",
  ...UPGRADE_CONDITION_CODES,
] as const;

export type PlanningQualityTier = (typeof PLANNING_QUALITY_TIERS)[number];
export type CapabilityId = (typeof CAPABILITY_IDS)[number];
export type WorkMode = (typeof WORK_MODES)[number];
export type WorkSurface = (typeof WORK_SURFACES)[number];
export type FailureRisk = (typeof FAILURE_RISKS)[number];
export type FailureImpact = (typeof FAILURE_IMPACTS)[number];
export type UpgradeConditionCode = (typeof UPGRADE_CONDITION_CODES)[number];
export type AppliedUpgradeTrigger = (typeof APPLIED_UPGRADE_TRIGGER_CODES)[number];

export const WORK_MODE_TO_SURFACE: Readonly<Record<WorkMode, WorkSurface>> = {
  interactive: "chat",
  "coding-agent": "ide-cli",
  batch: "batch",
};
