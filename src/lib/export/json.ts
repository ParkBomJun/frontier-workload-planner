import {
  MODEL_PRICING,
  MODEL_PRICING_LAST_UPDATED,
  MODEL_PRICING_SOURCE,
  PROMPT_CACHE_MIN_INPUT_TOKENS,
  PROMPT_CACHE_SOURCE,
} from "@/config/model-pricing";
import type { ModelTier, PlanExportContext } from "@/types/domain";

export const PLAN_JSON_SCHEMA_VERSION = 2;

export function createPlanJson(
  context: PlanExportContext,
  exportedAt = new Date().toISOString(),
): string {
  const pricing = Object.fromEntries(
    (Object.keys(MODEL_PRICING) as ModelTier[]).map((tier) => {
      const price = MODEL_PRICING[tier];
      return [
        tier,
        {
          modelId: price.modelId,
          inputUsdPerMillion: price.inputUsdPerMillion,
          cachedInputUsdPerMillion: price.cachedInputUsdPerMillion,
          cacheWriteInputUsdPerMillion: price.cacheWriteInputUsdPerMillion,
          outputUsdPerMillion: price.outputUsdPerMillion,
        },
      ];
    }),
  );
  const inputTasks = context.sourceTasks.map((task) => ({
    id: task.id,
    name: task.name,
    description: task.description,
    priority: task.priority,
  }));
  const resultTasks = context.plan.tasks.map((task) => {
    const base = {
      taskId: task.taskId,
      taskName: task.taskName,
      priority: task.priority,
      status: task.status,
      analysis: {
        taskId: task.analysis.taskId,
        taskType: task.analysis.taskType,
        complexity: task.analysis.complexity,
        reasoningDepth: task.analysis.reasoningDepth,
        expectedIterations: task.analysis.expectedIterations,
        estimatedInputSize: task.analysis.estimatedInputSize,
        estimatedOutputSize: task.analysis.estimatedOutputSize,
        uncertainty: task.analysis.uncertainty,
        recommendedModelTier: task.analysis.recommendedModelTier,
        riskFactors: task.analysis.riskFactors,
        rationale: task.analysis.rationale,
      },
      strategyTargetTier: task.strategyTargetTier,
      minimumExpectedCostUsd: task.minimumExpectedCostUsd,
    };

    return task.status === "held"
      ? {
          ...base,
          assignedTier: null,
          modelId: null,
          cost: null,
          wasDowngradedForBudget: false,
          holdReason: task.holdReason,
        }
      : {
          ...base,
          assignedTier: task.assignedTier,
          modelId: task.modelId,
          cost: task.cost,
          wasDowngradedForBudget: task.wasDowngradedForBudget,
          holdReason: null,
        };
  });

  return JSON.stringify(
    {
      schemaVersion: PLAN_JSON_SCHEMA_VERSION,
      exportedAt,
      product: "Frontier Workload Planner",
      claim: "Budget-aware recommended plan; not mathematical optimization.",
      analysis: {
        mode: context.analysisMode,
        model: context.analysisModel,
        generatedAt: context.generatedAt,
      },
      input: {
        tasks: inputTasks,
        settings: {
          budgetUsd: context.plan.settings.budgetUsd,
          deadlineDays: context.plan.settings.deadlineDays,
          strategy: context.plan.settings.strategy,
        },
      },
      result: {
        totals: context.plan.totals,
        minimumExpectedCostUsd: context.plan.minimumExpectedCostUsd,
        remainingBudgetUsd: context.plan.remainingBudgetUsd,
        expectedWithinBudget: context.plan.expectedWithinBudget,
        highExceedsBudget: context.plan.highExceedsBudget,
        activeTaskCount: context.plan.activeTaskCount,
        heldTaskCount: context.plan.heldTaskCount,
        downgradedTaskCount: context.plan.downgradedTaskCount,
        warnings: context.plan.warnings,
        tasks: resultTasks,
      },
      pricing: {
        lastUpdated: MODEL_PRICING_LAST_UPDATED,
        source: MODEL_PRICING_SOURCE,
        promptCacheSource: PROMPT_CACHE_SOURCE,
        cacheWritePricingApplied: true,
        cacheEligibilityMinInputTokensPerRequest: PROMPT_CACHE_MIN_INPUT_TOKENS,
        cacheDiscountApplied: false,
        models: pricing,
      },
    },
    null,
    2,
  );
}
