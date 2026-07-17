import { z } from "zod";

import {
  COMPLEXITY_LEVELS,
  MODEL_TIERS,
  REASONING_DEPTHS,
  SIZE_BANDS,
  TASK_PRIORITIES,
  TASK_TYPES,
  UNCERTAINTY_LEVELS,
} from "@/types/domain";
import {
  CAPABILITY_IDS,
  FAILURE_IMPACTS,
  FAILURE_RISKS,
  PLANNING_QUALITY_TIERS,
  UPGRADE_CONDITION_CODES,
  WORKLOAD_ANALYSIS_CONTRACT_VERSION,
  WORK_MODES,
} from "@/types/workload";

export const MAX_TASKS = 8;
export const MAX_TASK_ID_LENGTH = 64;
export const MAX_TASK_NAME_LENGTH = 100;
export const MAX_TASK_DESCRIPTION_LENGTH = 2_000;
export const MAX_RISK_FACTORS = 3;
export const MAX_OUTPUT_TOKENS = 3_000;
// Covers eight maximum-length fields even when most characters use four UTF-8 bytes.
export const MAX_REQUEST_BYTES = 96 * 1_024;

export const taskInputSchema = z.strictObject({
  id: z.string().trim().min(1).max(MAX_TASK_ID_LENGTH),
  name: z.string().trim().min(1).max(MAX_TASK_NAME_LENGTH),
  description: z.string().trim().min(1).max(MAX_TASK_DESCRIPTION_LENGTH),
  priority: z.enum(TASK_PRIORITIES),
  deadlineDate: z.iso.date().nullable(),
  failureImpact: z.enum(FAILURE_IMPACTS),
});

export const analyzeRequestSchema = z
  .strictObject({
    mode: z.enum(["mock", "live"]),
    tasks: z.array(taskInputSchema).min(1).max(MAX_TASKS),
  })
  .superRefine(({ tasks }, context) => {
    const seenIds = new Set<string>();
    tasks.forEach((task, index) => {
      if (seenIds.has(task.id)) {
        context.addIssue({
          code: "custom",
          path: ["tasks", index, "id"],
          message: "Task IDs must be unique.",
        });
      }
      seenIds.add(task.id);
    });
  });

export const taskAnalysisSchema = z.strictObject({
  taskId: z.string().min(1).max(MAX_TASK_ID_LENGTH),
  taskType: z.enum(TASK_TYPES),
  complexity: z.enum(COMPLEXITY_LEVELS),
  reasoningDepth: z.enum(REASONING_DEPTHS),
  expectedIterations: z.number().int().min(1).max(5),
  estimatedInputSize: z.enum(SIZE_BANDS),
  estimatedOutputSize: z.enum(SIZE_BANDS),
  uncertainty: z.enum(UNCERTAINTY_LEVELS),
  recommendedModelTier: z.enum(MODEL_TIERS),
  workMode: z.enum(WORK_MODES),
  requiredQualityTier: z.enum(PLANNING_QUALITY_TIERS),
  requiredCapabilities: z.array(z.enum(CAPABILITY_IDS)).max(CAPABILITY_IDS.length),
  upgradeConditions: z
    .array(z.enum(UPGRADE_CONDITION_CODES))
    .max(UPGRADE_CONDITION_CODES.length),
  failureRisk: z.enum(FAILURE_RISKS),
  riskFactors: z.array(z.string().min(1).max(120)).max(MAX_RISK_FACTORS),
  rationale: z.string().min(1).max(400),
});

export const analysisDocumentSchema = z.strictObject({
  contractVersion: z.literal(WORKLOAD_ANALYSIS_CONTRACT_VERSION),
  tasks: z.array(taskAnalysisSchema).min(1).max(MAX_TASKS),
});

export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;
