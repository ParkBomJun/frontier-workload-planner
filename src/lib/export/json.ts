import {
  PROVIDER_CATALOG,
  PROVIDER_PRICING_BASIS,
  PROVIDER_PRICING_EXCLUSIONS,
} from "@/config/provider-catalog";
import { resolveExportAnalysisContract } from "@/lib/export/analysis-contract";
import { isBestFitTaskAnalysis } from "@/lib/planning/workload-requirements";
import { MODEL_TIERS, PROVIDER_IDS, type PlanExportContext } from "@/types/domain";

export const LEGACY_PLAN_JSON_SCHEMA_VERSION = 3;
export const PLAN_JSON_SCHEMA_VERSION = 4;

export function createPlanJson(
  context: PlanExportContext,
  exportedAt = new Date().toISOString(),
): string {
  const { identity: analysisContract, isBestFit } = resolveExportAnalysisContract(context);
  const catalog = Object.fromEntries(
    PROVIDER_IDS.map((providerId) => {
      const provider = PROVIDER_CATALOG[providerId];
      const models = Object.fromEntries(
        MODEL_TIERS.map((tier) => {
          const model = provider.models[tier];
          return [
            tier,
            {
              catalogId: model.catalogId,
              displayName: model.displayName,
              inputUsdPerMillion: model.inputUsdPerMillion,
              outputUsdPerMillion: model.outputUsdPerMillion,
              preview: model.preview ?? false,
              effectiveThrough: model.effectiveThrough ?? null,
              priceAfterEffectiveThrough: model.priceAfterEffectiveThrough ?? null,
              standardPriceInputLimitTokens: model.standardPriceInputLimitTokens ?? null,
              excludedLongContextPrice: model.excludedLongContextPrice ?? null,
              limits: {
                maxInputTokens: model.limits.maxInputTokens ?? null,
                maxOutputTokens: model.limits.maxOutputTokens ?? null,
                maxCombinedTokens: model.limits.maxCombinedTokens ?? null,
                sourceUrl: model.limits.sourceUrl,
                verifiedAt: model.limits.verifiedAt,
              },
            },
          ];
        }),
      );

      return [
        providerId,
        {
          displayName: provider.displayName,
          productFamily: provider.productFamily,
          pricingSource: provider.pricingSource,
          modelsSource: provider.modelsSource,
          verifiedAt: provider.verifiedAt,
          models,
        },
      ];
    }),
  );
  const inputTasks = context.sourceTasks.map((task) =>
    isBestFit
      ? {
          id: task.id,
          name: task.name,
          description: task.description,
          priority: task.priority,
          deadlineDate: task.deadlineDate,
          failureImpact: task.failureImpact,
        }
      : {
          id: task.id,
          name: task.name,
          description: task.description,
          priority: task.priority,
        },
  );
  const resultTasks = context.plan.tasks.map((task) => {
    const bestFitAnalysis = isBestFitTaskAnalysis(task.analysis) ? task.analysis : null;
    const legacyAnalysis = {
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
    };
    const base = {
      taskId: task.taskId,
      taskName: task.taskName,
      priority: task.priority,
      status: task.status,
      analysis:
        isBestFit && bestFitAnalysis
          ? {
              ...legacyAnalysis,
              workMode: bestFitAnalysis.workMode,
              requiredQualityTier: bestFitAnalysis.requiredQualityTier,
              requiredCapabilities: bestFitAnalysis.requiredCapabilities,
              upgradeConditions: bestFitAnalysis.upgradeConditions,
              failureRisk: bestFitAnalysis.failureRisk,
            }
          : legacyAnalysis,
      strategyTargetTier: task.strategyTargetTier,
      minimumExpectedCostUsd: task.minimumExpectedCostUsd,
    };

    if (task.status === "held") {
      return {
        ...base,
        assignedTier: null,
        modelId: null,
        cost: null,
        wasDowngradedForBudget: false,
        wasReassignedForLimits: task.wasReassignedForLimits,
        holdReason: task.holdReason,
        infeasibleReason: null,
        offeringFailures: task.offeringFailures,
      };
    }
    if (task.status === "infeasible") {
      return {
        ...base,
        assignedTier: null,
        modelId: null,
        cost: null,
        wasDowngradedForBudget: false,
        wasReassignedForLimits: false,
        holdReason: null,
        infeasibleReason: task.infeasibleReason,
        offeringFailures: task.offeringFailures,
      };
    }
    return {
      ...base,
      assignedTier: task.assignedTier,
      modelId: task.modelId,
      cost: task.cost,
      wasDowngradedForBudget: task.wasDowngradedForBudget,
      wasReassignedForLimits: task.wasReassignedForLimits,
      holdReason: null,
      infeasibleReason: null,
      offeringFailures: task.offeringFailures,
    };
  });

  return JSON.stringify(
    {
      schemaVersion: isBestFit
        ? PLAN_JSON_SCHEMA_VERSION
        : LEGACY_PLAN_JSON_SCHEMA_VERSION,
      exportedAt,
      product: "Frontier Workload Planner",
      claim: "Budget-aware recommended plan; not mathematical optimization.",
      analysis: {
        mode: context.analysisMode,
        model: context.analysisModel,
        generatedAt: context.generatedAt,
        ...(isBestFit
          ? {
              contractVersion: analysisContract.contractVersion,
              compatibility: analysisContract.compatibility,
            }
          : {}),
      },
      input: {
        tasks: inputTasks,
        selectedProvider: context.plan.providerId,
        settings: {
          budgetUsd: context.plan.settings.budgetUsd,
          deadlineDays: context.plan.settings.deadlineDays,
          strategy: context.plan.settings.strategy,
        },
      },
      result: {
        providerId: context.plan.providerId,
        totals: context.plan.totals,
        minimumExpectedCostUsd: context.plan.minimumExpectedCostUsd,
        remainingBudgetUsd: context.plan.remainingBudgetUsd,
        expectedWithinBudget: context.plan.expectedWithinBudget,
        highExceedsBudget: context.plan.highExceedsBudget,
        activeTaskCount: context.plan.activeTaskCount,
        heldTaskCount: context.plan.heldTaskCount,
        infeasibleTaskCount: context.plan.infeasibleTaskCount,
        downgradedTaskCount: context.plan.downgradedTaskCount,
        limitReassignedTaskCount: context.plan.limitReassignedTaskCount,
        warnings: context.plan.warnings,
        tasks: resultTasks,
      },
      comparison: {
        providers: context.providerComparisons.map((comparison) => ({
          providerId: comparison.providerId,
          totals: comparison.totals,
          expectedWithinBudget: comparison.expectedWithinBudget,
          allTasksActiveWithinBudget: comparison.allTasksActiveWithinBudget,
          highExceedsBudget: comparison.highExceedsBudget,
          activeTaskCount: comparison.activeTaskCount,
          heldTaskCount: comparison.heldTaskCount,
          infeasibleTaskCount: comparison.infeasibleTaskCount,
          downgradedTaskCount: comparison.downgradedTaskCount,
          limitReassignedTaskCount: comparison.limitReassignedTaskCount,
        })),
      },
      pricing: {
        basis: PROVIDER_PRICING_BASIS,
        exclusions: [...PROVIDER_PRICING_EXCLUSIONS],
        heuristicTierMapping: true,
        objectiveQualityRanking: false,
        cacheWritePricingApplied: false,
        cacheDiscountApplied: false,
        batchPricingApplied: false,
        toolCallFeesApplied: false,
        longContextSurchargesApplied: false,
        catalog,
      },
    },
    null,
    2,
  );
}
