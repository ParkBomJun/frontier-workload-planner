import { z } from "zod";

// These schemas are immutable historical contracts. Keep their literals and limits local:
// importing current task, analysis, response, enum, or length-limit schemas would make a
// future live-contract change reinterpret already-saved bytes.
const TASK_TYPES_V1 = [
  "software-development",
  "research",
  "writing",
  "data-analysis",
  "planning",
  "creative",
  "multimodal",
  "other",
] as const;
const COMPLEXITY_LEVELS_V1 = ["low", "medium", "high", "very-high"] as const;
const REASONING_DEPTHS_V1 = ["light", "moderate", "deep"] as const;
const SIZE_BANDS_V1 = ["xs", "s", "m", "l", "xl"] as const;
const UNCERTAINTY_LEVELS_V1 = ["low", "medium", "high"] as const;
const MODEL_TIERS_V1 = ["economy", "balanced", "frontier"] as const;
const TASK_PRIORITIES_V2 = ["high", "medium", "low"] as const;
const PROVIDER_IDS_V3 = ["openai", "anthropic", "google"] as const;
const PLANNING_STRATEGIES_V1 = ["cost-saver", "balanced", "quality-first"] as const;
const FAILURE_IMPACTS_V4 = ["low", "medium", "high", "unspecified"] as const;
const WORK_MODES_V4 = ["interactive", "coding-agent", "batch"] as const;
const PLANNING_QUALITY_TIERS_V4 = ["economy", "balanced", "premium"] as const;
const CAPABILITY_IDS_V4 = [
  "vision-input",
  "file-input",
  "code-editing",
  "structured-output",
  "tool-use",
] as const;
const UPGRADE_CONDITION_CODES_V4 = ["deep-reasoning", "large-code-change"] as const;
const FAILURE_RISKS_V4 = ["low", "medium", "high"] as const;

const MAX_TASKS_V1 = 8;
const MAX_TASK_ID_LENGTH_V1 = 64;
const MAX_TASK_NAME_LENGTH_V1 = 100;
const MAX_TASK_DESCRIPTION_LENGTH_V1 = 2_000;
const MAX_RISK_FACTORS_V1 = 3;

function createHistoricalTaskSchema(withPriority: boolean) {
  const baseShape = {
    id: z.string().trim().min(1).max(MAX_TASK_ID_LENGTH_V1),
    name: z.string().trim().min(1).max(MAX_TASK_NAME_LENGTH_V1),
    description: z.string().trim().min(1).max(MAX_TASK_DESCRIPTION_LENGTH_V1),
  };

  return withPriority
    ? z.strictObject({ ...baseShape, priority: z.enum(TASK_PRIORITIES_V2) })
    : z.strictObject(baseShape);
}

function createHistoricalPlanningSettingsSchema() {
  return z.strictObject({
    budgetUsd: z.number().finite().min(0.01).max(10_000),
    deadlineDays: z.number().int().min(1).max(90),
    strategy: z.enum(PLANNING_STRATEGIES_V1),
  });
}

function createHistoricalPlanningSettingsSchemaV5() {
  const budgetUsdSchema = z.number().finite().min(0.01).max(10_000);
  return z
    .strictObject({
      budgetUsd: budgetUsdSchema,
      deadlineDays: z.number().int().min(1).max(90),
      strategy: z.enum(PLANNING_STRATEGIES_V1),
      incrementalCashBudget: z.discriminatedUnion("status", [
        z.strictObject({
          status: z.literal("legacy-api-only-unconfirmed"),
          legacyBudgetUsd: budgetUsdSchema,
        }),
        z.strictObject({
          status: z.literal("confirmed"),
          incrementalCashBudgetUsd: budgetUsdSchema,
          confirmedAt: z.iso.datetime(),
        }),
      ]),
    })
    .superRefine(({ budgetUsd, incrementalCashBudget }, context) => {
      if (
        incrementalCashBudget.status === "legacy-api-only-unconfirmed" &&
        incrementalCashBudget.legacyBudgetUsd !== budgetUsd
      ) {
        context.addIssue({
          code: "custom",
          path: ["incrementalCashBudget", "legacyBudgetUsd"],
          message: "Historical v5 unconfirmed budget must preserve the API-only amount.",
        });
      }
    });
}

function createHistoricalTaskSchemaV4() {
  return z.strictObject({
    id: z.string().trim().min(1).max(MAX_TASK_ID_LENGTH_V1),
    name: z.string().trim().min(1).max(MAX_TASK_NAME_LENGTH_V1),
    description: z.string().trim().min(1).max(MAX_TASK_DESCRIPTION_LENGTH_V1),
    priority: z.enum(TASK_PRIORITIES_V2),
    deadlineDate: z.iso.date().nullable(),
    failureImpact: z.enum(FAILURE_IMPACTS_V4),
  });
}

function createHistoricalSuccessResponseSchema() {
  const taskAnalysisSchema = z.strictObject({
    taskId: z.string().min(1).max(MAX_TASK_ID_LENGTH_V1),
    taskType: z.enum(TASK_TYPES_V1),
    complexity: z.enum(COMPLEXITY_LEVELS_V1),
    reasoningDepth: z.enum(REASONING_DEPTHS_V1),
    expectedIterations: z.number().int().min(1).max(5),
    estimatedInputSize: z.enum(SIZE_BANDS_V1),
    estimatedOutputSize: z.enum(SIZE_BANDS_V1),
    uncertainty: z.enum(UNCERTAINTY_LEVELS_V1),
    recommendedModelTier: z.enum(MODEL_TIERS_V1),
    riskFactors: z
      .array(z.string().min(1).max(120))
      .max(MAX_RISK_FACTORS_V1),
    rationale: z.string().min(1).max(400),
  });

  return z.strictObject({
    ok: z.literal(true),
    mode: z.enum(["mock", "live"]),
    model: z.string().min(1).max(200),
    generatedAt: z.iso.datetime(),
    analysis: z.strictObject({
      tasks: z.array(taskAnalysisSchema).min(1).max(MAX_TASKS_V1),
    }),
  });
}

function createHistoricalSuccessResponseV2Schema() {
  const taskAnalysisSchema = z.strictObject({
    taskId: z.string().min(1).max(MAX_TASK_ID_LENGTH_V1),
    taskType: z.enum(TASK_TYPES_V1),
    complexity: z.enum(COMPLEXITY_LEVELS_V1),
    reasoningDepth: z.enum(REASONING_DEPTHS_V1),
    expectedIterations: z.number().int().min(1).max(5),
    estimatedInputSize: z.enum(SIZE_BANDS_V1),
    estimatedOutputSize: z.enum(SIZE_BANDS_V1),
    uncertainty: z.enum(UNCERTAINTY_LEVELS_V1),
    recommendedModelTier: z.enum(MODEL_TIERS_V1),
    workMode: z.enum(WORK_MODES_V4),
    requiredQualityTier: z.enum(PLANNING_QUALITY_TIERS_V4),
    requiredCapabilities: z
      .array(z.enum(CAPABILITY_IDS_V4))
      .max(CAPABILITY_IDS_V4.length),
    upgradeConditions: z
      .array(z.enum(UPGRADE_CONDITION_CODES_V4))
      .max(UPGRADE_CONDITION_CODES_V4.length),
    failureRisk: z.enum(FAILURE_RISKS_V4),
    riskFactors: z
      .array(z.string().min(1).max(120))
      .max(MAX_RISK_FACTORS_V1),
    rationale: z.string().min(1).max(400),
  });

  return z.strictObject({
    ok: z.literal(true),
    mode: z.enum(["mock", "live"]),
    model: z.string().min(1).max(200),
    generatedAt: z.iso.datetime(),
    analysis: z.strictObject({
      contractVersion: z.literal("best-fit-analysis-v2"),
      tasks: z.array(taskAnalysisSchema).min(1).max(MAX_TASKS_V1),
    }),
  });
}

function createHistoricalAnalysisSnapshotV4Schema() {
  return z.discriminatedUnion("contractVersion", [
    z.strictObject({
      contractVersion: z.literal("api-analysis-v1"),
      compatibility: z.literal("legacy-api-only"),
      response: createHistoricalSuccessResponseSchema(),
    }),
    z.strictObject({
      contractVersion: z.literal("best-fit-analysis-v2"),
      compatibility: z.literal("best-fit"),
      response: createHistoricalSuccessResponseV2Schema(),
    }),
  ]);
}

function addHistoricalIdentityValidation<
  Schema extends z.ZodObject<{
    tasks: z.ZodArray<z.ZodObject>;
    response: z.ZodObject<{
      analysis: z.ZodObject<{
        tasks: z.ZodArray<z.ZodObject>;
      }>;
    }>;
  }>,
>(schema: Schema) {
  return schema.superRefine((value, context) => {
    const tasks = value.tasks as Array<{ id: string }>;
    const analyses = value.response.analysis.tasks as Array<{ taskId: string }>;
    const taskIds = new Set<string>();

    tasks.forEach((task, index) => {
      if (taskIds.has(task.id)) {
        context.addIssue({
          code: "custom",
          path: ["tasks", index, "id"],
          message: "Stored task IDs must be unique.",
        });
      }
      taskIds.add(task.id);
    });

    const identitiesMatch =
      analyses.length === tasks.length &&
      analyses.every((analysis, index) => analysis.taskId === tasks[index].id);
    if (!identitiesMatch) {
      context.addIssue({
        code: "custom",
        path: ["response", "analysis", "tasks"],
        message: "Stored analyses must preserve task order and identity.",
      });
    }
  });
}

export const historicalRecentScenarioV1Schema = addHistoricalIdentityValidation(
  z.strictObject({
    schemaVersion: z.literal(1),
    savedAt: z.iso.datetime(),
    tasks: z.array(createHistoricalTaskSchema(false)).min(1).max(MAX_TASKS_V1),
    settings: createHistoricalPlanningSettingsSchema(),
    response: createHistoricalSuccessResponseSchema(),
  }),
);

export const historicalRecentScenarioV2Schema = addHistoricalIdentityValidation(
  z.strictObject({
    schemaVersion: z.literal(2),
    savedAt: z.iso.datetime(),
    tasks: z.array(createHistoricalTaskSchema(true)).min(1).max(MAX_TASKS_V1),
    settings: createHistoricalPlanningSettingsSchema(),
    response: createHistoricalSuccessResponseSchema(),
  }),
);

export const historicalRecentScenarioV3Schema = addHistoricalIdentityValidation(
  z.strictObject({
    schemaVersion: z.literal(3),
    savedAt: z.iso.datetime(),
    selectedProvider: z.enum(PROVIDER_IDS_V3),
    tasks: z.array(createHistoricalTaskSchema(true)).min(1).max(MAX_TASKS_V1),
    settings: createHistoricalPlanningSettingsSchema(),
    response: createHistoricalSuccessResponseSchema(),
  }),
);

export const historicalRecentScenarioV4Schema = z
  .strictObject({
    schemaVersion: z.literal(4),
    savedAt: z.iso.datetime(),
    selectedProvider: z.enum(PROVIDER_IDS_V3),
    tasks: z.array(createHistoricalTaskSchemaV4()).min(1).max(MAX_TASKS_V1),
    settings: createHistoricalPlanningSettingsSchema(),
    analysisSnapshot: createHistoricalAnalysisSnapshotV4Schema(),
  })
  .superRefine(({ tasks, analysisSnapshot }, context) => {
    const taskIds = new Set<string>();
    tasks.forEach((task, index) => {
      if (taskIds.has(task.id)) {
        context.addIssue({
          code: "custom",
          path: ["tasks", index, "id"],
          message: "Stored task IDs must be unique.",
        });
      }
      taskIds.add(task.id);
    });

    const analyses = analysisSnapshot.response.analysis.tasks;
    const identitiesMatch =
      analyses.length === tasks.length &&
      analyses.every((analysis, index) => analysis.taskId === tasks[index].id);
    if (!identitiesMatch) {
      context.addIssue({
        code: "custom",
        path: ["analysisSnapshot", "response", "analysis", "tasks"],
        message: "Stored analyses must preserve task order and identity.",
      });
    }
  });

export const historicalRecentScenarioV5Schema = z
  .strictObject({
    schemaVersion: z.literal(5),
    savedAt: z.iso.datetime(),
    selectedProvider: z.enum(PROVIDER_IDS_V3),
    tasks: z.array(createHistoricalTaskSchemaV4()).min(1).max(MAX_TASKS_V1),
    settings: createHistoricalPlanningSettingsSchemaV5(),
    analysisSnapshot: createHistoricalAnalysisSnapshotV4Schema(),
  })
  .superRefine(({ tasks, analysisSnapshot }, context) => {
    const taskIds = new Set<string>();
    tasks.forEach((task, index) => {
      if (taskIds.has(task.id)) {
        context.addIssue({
          code: "custom",
          path: ["tasks", index, "id"],
          message: "Stored task IDs must be unique.",
        });
      }
      taskIds.add(task.id);
    });

    const analyses = analysisSnapshot.response.analysis.tasks;
    const identitiesMatch =
      analyses.length === tasks.length &&
      analyses.every((analysis, index) => analysis.taskId === tasks[index].id);
    if (!identitiesMatch) {
      context.addIssue({
        code: "custom",
        path: ["analysisSnapshot", "response", "analysis", "tasks"],
        message: "Stored analyses must preserve task order and identity.",
      });
    }
  });

export const frozenAnalyzeSuccessResponseV1Schema =
  createHistoricalSuccessResponseSchema();

export type HistoricalRecentScenarioV1 = z.infer<
  typeof historicalRecentScenarioV1Schema
>;
export type HistoricalRecentScenarioV2 = z.infer<
  typeof historicalRecentScenarioV2Schema
>;
export type HistoricalRecentScenarioV3 = z.infer<
  typeof historicalRecentScenarioV3Schema
>;
export type HistoricalRecentScenarioV4 = z.infer<
  typeof historicalRecentScenarioV4Schema
>;
export type HistoricalRecentScenarioV5 = z.infer<
  typeof historicalRecentScenarioV5Schema
>;
export type FrozenAnalyzeSuccessResponseV1 = HistoricalRecentScenarioV3["response"];
