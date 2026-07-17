import {
  MODEL_PRICING,
  MODEL_PRICING_LAST_UPDATED,
  MODEL_PRICING_SOURCE,
} from "@/config/model-pricing";
import type { ModelTier, PlanExportContext } from "@/types/domain";

export const PLAN_JSON_SCHEMA_VERSION = 1;

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
          outputUsdPerMillion: price.outputUsdPerMillion,
        },
      ];
    }),
  );

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
        tasks: context.sourceTasks,
        settings: context.plan.settings,
      },
      result: {
        totals: context.plan.totals,
        minimumExpectedCostUsd: context.plan.minimumExpectedCostUsd,
        remainingBudgetUsd: context.plan.remainingBudgetUsd,
        expectedWithinBudget: context.plan.expectedWithinBudget,
        highExceedsBudget: context.plan.highExceedsBudget,
        downgradedTaskCount: context.plan.downgradedTaskCount,
        warnings: context.plan.warnings,
        tasks: context.plan.tasks,
      },
      pricing: {
        lastUpdated: MODEL_PRICING_LAST_UPDATED,
        source: MODEL_PRICING_SOURCE,
        cacheDiscountApplied: false,
        models: pricing,
      },
    },
    null,
    2,
  );
}
