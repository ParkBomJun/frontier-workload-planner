import { describe, expect, it } from "vitest";

import { createMockAnalysis } from "@/lib/ai/mock-response";
import { compareProviderPlans } from "@/lib/calculation/compare-providers";
import {
  LEGACY_PLAN_JSON_SCHEMA_VERSION,
  PLAN_JSON_SCHEMA_VERSION,
  createPlanJson,
} from "@/lib/export/json";
import { createPlanMarkdown } from "@/lib/export/markdown";
import type {
  LegacyTaskAnalysis,
  PlanExportContext,
  TaskInput,
} from "@/types/domain";

const tasks: TaskInput[] = [
  {
    id: "task-1",
    name: "API | 설계\\검토",
    description: "첫 줄\n둘째 | 줄",
    priority: "high",
    deadlineDate: "2026-07-21",
    failureImpact: "high",
  },
  {
    id: "task-2",
    name: "출시 안내문",
    description: "사용자를 위한 안내문을 작성한다.",
    priority: "low",
    deadlineDate: null,
    failureImpact: "medium",
  },
];
const analyses = createMockAnalysis(tasks).tasks;

function toLegacyAnalysis(analysis: (typeof analyses)[number]): LegacyTaskAnalysis {
  return {
    taskId: analysis.taskId,
    taskType: analysis.taskType,
    complexity: analysis.complexity,
    reasoningDepth: analysis.reasoningDepth,
    expectedIterations: analysis.expectedIterations,
    estimatedInputSize: analysis.estimatedInputSize,
    estimatedOutputSize: analysis.estimatedOutputSize,
    uncertainty: analysis.uncertainty,
    recommendedModelTier: analysis.recommendedModelTier,
    riskFactors: analysis.riskFactors,
    rationale: analysis.rationale,
  };
}

const planning = compareProviderPlans(tasks, analyses, {
  budgetUsd: 5,
  deadlineDays: 7,
  strategy: "balanced",
});
const plan = planning.plans.openai;
const context: PlanExportContext = {
  sourceTasks: tasks,
  plan,
  providerComparisons: planning.comparisons,
  analysisMode: "mock",
  analysisModel: "mock-fixture-v2",
  analysisContract: {
    contractVersion: "best-fit-analysis-v2",
    compatibility: "best-fit",
  },
  generatedAt: "2026-07-17T01:00:00.000Z",
};
const firstMinimumExpectedCostUsd = plan.tasks[0].minimumExpectedCostUsd;
if (firstMinimumExpectedCostUsd === null) {
  throw new Error("The OpenAI export fixture must have a compatible offering.");
}
const constrainedPlanning = compareProviderPlans(tasks, analyses, {
  budgetUsd: firstMinimumExpectedCostUsd,
  deadlineDays: 7,
  strategy: "balanced",
});
const constrainedPlan = constrainedPlanning.plans.openai;
const constrainedContext: PlanExportContext = {
  ...context,
  plan: constrainedPlan,
  providerComparisons: constrainedPlanning.comparisons,
};

describe("plan Markdown export", () => {
  it("includes every task, three-provider comparison, prices, and escaped user text", () => {
    const markdown = createPlanMarkdown(context);

    expect(markdown).toContain("API \\| 설계\\\\검토");
    expect(markdown).toContain("첫 줄<br>둘째 \\| 줄");
    expect(markdown).toContain("출시 안내문");
    expect(markdown).toContain(plan.tasks[0].modelId);
    expect(markdown).toContain("| 높음 (`high`) | 실행 |");
    expect(markdown).toContain("적게 사용 | 보통 사용 | 많이 사용");
    expect(markdown).toContain("분석 계약: `best-fit-analysis-v2` / `best-fit`");
    expect(markdown).toContain("작업 기한: 2026-07-21");
    expect(markdown).toContain("실패 영향: 높음 (`high`)");
    expect(markdown).toContain("작업 모드: `coding-agent`");
    expect(markdown).toContain("최소 품질: `balanced`");
    expect(markdown).toContain("작업 방식과 필수 기능 충족 여부는 위 맞춤 계획에서 별도로 확인합니다");
    expect(markdown).toContain("확인 범위 내 적합");
    expect(markdown).toContain("## 공급자별 비교");
    expect(markdown).toContain("OpenAI · GPT-5.6");
    expect(markdown).toContain("Anthropic · Claude");
    expect(markdown).toContain("Google · Gemini 3");
    expect(markdown).toContain("https://developers.openai.com/api/docs/pricing");
    expect(markdown).toContain("https://platform.claude.com/docs/en/about-claude/pricing");
    expect(markdown).toContain("https://ai.google.dev/gemini-api/docs/pricing");
    expect(markdown).toContain("2026-08-31까지 현재 가격");
    expect(markdown).toContain("미리보기");
    const flashLiteLine = markdown
      .split("\n")
      .find((line) => line.includes("`gemini-3.1-flash-lite`"));
    expect(flashLiteLine).toBeDefined();
    expect(flashLiteLine).not.toContain("미리보기");
    expect(markdown).toContain("prompt 200,000토큰 이하 가격");
    expect(markdown).toContain("캐시 쓰기·적중, Batch 할인, 도구 호출비, 장문 구간 할증");
    expect(markdown).toContain("객관적인 품질 순위가 아닙니다");
    expect(markdown).toContain("예시 계획은 저장된 예시 분석을 사용하며 외부 AI를 호출하지 않습니다.");
    expect(markdown).toContain("Claude와 Gemini API는 호출하지 않습니다.");
    expect(createPlanMarkdown(context)).toBe(markdown);
    expect(createPlanMarkdown(context, "ko")).toBe(markdown);
  });

  it("neutralizes HTML, entities, links, and Markdown controls in user text", () => {
    const unsafeTasks: TaskInput[] = [
      {
        ...tasks[0],
        name: "# [Run](javascript:alert(1)) *now* & <b>",
        description: "<script>alert(1)</script>\n![pixel](https://example.invalid/x)",
      },
    ];
    const unsafeAnalyses = createMockAnalysis(unsafeTasks).tasks;
    const unsafePlanning = compareProviderPlans(unsafeTasks, unsafeAnalyses, {
      budgetUsd: 5,
      deadlineDays: 7,
      strategy: "balanced",
    });
    const markdown = createPlanMarkdown({
      ...context,
      sourceTasks: unsafeTasks,
      plan: unsafePlanning.plans.openai,
      providerComparisons: unsafePlanning.comparisons,
    });

    expect(markdown).toContain(
      "\\# \\[Run\\]\\(javascript:alert\\(1\\)\\) \\*now\\* &amp; &lt;b&gt;",
    );
    expect(markdown).toContain(
      "&lt;script&gt;alert\\(1\\)&lt;/script&gt;<br>\\!\\[pixel\\]\\(https://example.invalid/x\\)",
    );
    expect(markdown).not.toContain("<script>");
    expect(markdown).not.toContain("[Run](javascript:");
  });

  it("shows held priority and reason without inventing a model or execution cost", () => {
    const markdown = createPlanMarkdown(constrainedContext);

    expect(constrainedPlan.tasks.map((task) => task.status)).toEqual(["active", "held"]);
    expect(markdown).toContain("| 낮음 (`low`) | 보류 |");
    expect(markdown).toContain("| — | — | — | — |");
    expect(markdown).toContain("보류 사유:");
    expect(markdown).toContain("비용 합계는 실행 작업만 포함");
  });

  it("localizes the human-readable English export without translating source or GPT text", () => {
    const markdown = createPlanMarkdown(constrainedContext, "en");

    expect(markdown).toContain("## Analysis information");
    expect(markdown).toContain("## Provider comparison");
    expect(markdown).toContain("## Task allocation");
    expect(markdown).toContain("## Warnings");
    expect(markdown).toContain("## Pricing and calculation assumptions");
    expect(markdown).toContain("| Low (`low`) | On hold |");
    expect(markdown).toContain("Reason for hold: The lowest likely-use total under the checked conditions exceeded the budget");
    expect(markdown).toContain("Work mode and required capabilities are checked separately in the plan above");
    expect(markdown).toContain("A saved sample provides the task analysis");
    expect(markdown).toContain(
      "The sample plan uses a saved sample analysis and does not call an external AI.",
    );
    expect(markdown).toContain("The economy, balanced, and high-performance groups are a simple rule used for budget planning");
    expect(markdown).toContain("They do not claim objective quality equivalence");
    expect(markdown).toContain("Cache writes and hits, Batch discounts, tool-call fees");
    expect(markdown).toContain("standard-uncached-text");
    expect(markdown).toContain("`cache-discounts-and-writes`");
    expect(markdown).toContain("`claude-sonnet-5`");
    expect(markdown).toContain("Lower use | Likely use | Higher use");
    expect(markdown).toContain("USD");
    expect(markdown).toContain("https://ai.google.dev/gemini-api/docs/pricing");
    expect(markdown).toContain("첫 줄<br>둘째 \\| 줄");
    expect(markdown).toContain(analyses[0].rationale);
    expect(markdown).not.toContain("## 공급자별 비교");
    expect(createPlanMarkdown(constrainedContext, "en")).toBe(markdown);
  });

  it("localizes Japanese labels and distinguishes own-task analysis from a sample", () => {
    const liveContext: PlanExportContext = {
      ...constrainedContext,
      analysisMode: "live",
      analysisModel: "gpt-5.6",
    };
    const markdown = createPlanMarkdown(liveContext, "ja");

    expect(markdown).toContain("## 分析情報");
    expect(markdown).toContain("## プロバイダー別比較");
    expect(markdown).toContain("## タスク別配分");
    expect(markdown).toContain("## 警告");
    expect(markdown).toContain("## 料金と計算の前提");
    expect(markdown).toContain("| 低 (`low`) | 保留 |");
    expect(markdown).toContain("保留理由: 現在確認した条件で全作業の標準利用時の最小費用が予算を超えたため");
    expect(markdown).toContain("作業方法と必須機能への対応は、上の計画で別に確認します");
    expect(markdown).toContain("GPT-5.6がタスクを1回だけ分析し");
    expect(markdown).toContain("自分の作業はGPT-5.6だけが分析し、ClaudeとGemini APIは呼び出しません。");
    expect(markdown).not.toContain("保存済みfixture");
    expect(markdown).toContain("予算計画のための簡単なルール");
    expect(markdown).toContain("客観的な品質の同等性、優劣");
    expect(markdown).toContain("キャッシュの書き込み・ヒット、Batch割引");
    expect(markdown).toContain("`gemini-3.1-pro-preview`");
    expect(markdown).toContain("少なめ | 標準 | 多め");
    expect(markdown).toContain("USD");
    expect(markdown).toContain("https://platform.claude.com/docs/en/about-claude/pricing");
    expect(markdown).toContain("첫 줄<br>둘째 \\| 줄");
    expect(markdown).toContain(analyses[0].rationale);
    expect(markdown).not.toContain("## 가격과 계산 가정");
    expect(createPlanMarkdown(liveContext, "ja")).toBe(markdown);
  });
});

describe("plan JSON export", () => {
  it("produces a parseable v4 workload projection with comparisons and pricing assumptions", () => {
    const exportedAt = "2026-07-17T01:02:00.000Z";
    const json = createPlanJson(context, exportedAt);
    const parsed = JSON.parse(json) as {
      schemaVersion: number;
      allocationEligibilityBasis: { requiredCapabilitiesApplied: boolean };
      comparison: {
        providers: Array<{
          providerId: string;
          allTasksActiveWithinBudget: boolean;
        }>;
      };
      pricing: { catalog: Record<string, unknown> };
    } & Record<string, unknown>;

    expect(parsed).toMatchObject({
      schemaVersion: PLAN_JSON_SCHEMA_VERSION,
      exportedAt,
      product: "Frontier Workload Planner",
      analysis: {
        mode: "mock",
        model: "mock-fixture-v2",
        generatedAt: context.generatedAt,
        contractVersion: "best-fit-analysis-v2",
        compatibility: "best-fit",
      },
      allocationEligibilityBasis: {
        statusMeaning: "cost-projection-not-confirmed-offering-eligibility",
        minimumQualityApplied: true,
        invocationLimitsApplied: true,
        budgetApplied: true,
        workModeSurfaceApplied: false,
        requiredCapabilitiesApplied: false,
        providerCapabilityKnowledge: "unknown",
        offeringEligibilityApplied: false,
      },
      input: {
        tasks,
        selectedProvider: "openai",
        settings: plan.settings,
      },
      result: {
        providerId: "openai",
        totals: plan.totals,
        tasks: plan.tasks,
      },
      pricing: {
        basis: "standard-uncached-text",
        exclusions: [
          "cache-discounts-and-writes",
          "batch-pricing",
          "tool-call-fees",
          "long-context-surcharges",
        ],
        heuristicTierMapping: true,
        objectiveQualityRanking: false,
        cacheWritePricingApplied: false,
        cacheDiscountApplied: false,
        batchPricingApplied: false,
        toolCallFeesApplied: false,
        longContextSurchargesApplied: false,
      },
    });
    expect(json).toContain('"deadlineDate"');
    expect(json).toContain('"failureImpact"');
    expect(json).toContain('"requiredQualityTier"');
    expect(json).toContain('"workMode"');
    expect(parsed.comparison.providers.map(({ providerId }) => providerId)).toEqual([
      "openai",
      "anthropic",
      "google",
    ]);
    expect(
      parsed.comparison.providers.every(
        ({ allTasksActiveWithinBudget }) => allTasksActiveWithinBudget,
      ),
    ).toBe(true);
    expect(parsed.allocationEligibilityBasis.requiredCapabilitiesApplied).toBe(false);
    expect(parsed.pricing.catalog).toMatchObject({
      openai: {
        verifiedAt: "2026-07-18",
        pricingSource: "https://developers.openai.com/api/docs/pricing",
        models: {
          economy: {
            catalogId: "gpt-5.6-luna",
            inputUsdPerMillion: 1,
            outputUsdPerMillion: 6,
            limits: {
              maxInputTokens: 922_000,
              maxOutputTokens: 128_000,
              maxCombinedTokens: 1_050_000,
              sourceUrl: "https://developers.openai.com/api/docs/models/gpt-5.6-luna",
              verifiedAt: "2026-07-18",
            },
          },
        },
      },
      anthropic: {
        verifiedAt: "2026-07-18",
        models: {
          balanced: {
            catalogId: "claude-sonnet-5",
            effectiveThrough: "2026-08-31",
          },
        },
      },
      google: {
        verifiedAt: "2026-07-18",
        models: {
          economy: {
            catalogId: "gemini-3.1-flash-lite",
            preview: false,
          },
          frontier: {
            catalogId: "gemini-3.1-pro-preview",
            preview: true,
            standardPriceInputLimitTokens: 200_000,
          },
        },
      },
    });
    expect(json).not.toContain("OPENAI_API_KEY");
    expect(json).not.toContain("NEXT_PUBLIC_");
    expect(json).not.toContain("cacheWriteInputUsdPerMillion");
  });

  it("exports held work as an explicit null allocation in schema v4", () => {
    const parsed = JSON.parse(createPlanJson(constrainedContext)) as {
      schemaVersion: number;
      result: {
        activeTaskCount: number;
        heldTaskCount: number;
        tasks: Array<{
          priority: string;
          status: string;
          assignedTier: string | null;
          modelId: string | null;
          cost: unknown;
          holdReason: string | null;
        }>;
      };
    };
    const held = parsed.result.tasks.find((task) => task.status === "held");

    expect(parsed.schemaVersion).toBe(PLAN_JSON_SCHEMA_VERSION);
    expect(parsed.result).toMatchObject({ activeTaskCount: 1, heldTaskCount: 1 });
    expect(held).toMatchObject({
      priority: "low",
      assignedTier: null,
      modelId: null,
      cost: null,
      holdReason: "insufficient-budget",
    });
    expect(constrainedPlan.totals.expectedUsd).toBe(
      constrainedPlan.tasks[0].minimumExpectedCostUsd,
    );
  });

  it("preserves excluded-tier limit failures after a compatible reassignment", () => {
    const largeAnalysis = {
      ...analyses[0],
      expectedIterations: 1,
      estimatedInputSize: "xl" as const,
      estimatedOutputSize: "xl" as const,
      recommendedModelTier: "economy" as const,
    };
    const reassignedPlanning = compareProviderPlans([tasks[0]], [largeAnalysis], {
      budgetUsd: 1.024,
      deadlineDays: 7,
      strategy: "balanced",
    });
    const reassignedContext: PlanExportContext = {
      ...context,
      sourceTasks: [tasks[0]],
      plan: reassignedPlanning.plans.anthropic,
      providerComparisons: reassignedPlanning.comparisons,
    };
    const markdown = createPlanMarkdown(reassignedContext, "en");
    const parsed = JSON.parse(createPlanJson(reassignedContext)) as {
      result: {
        tasks: Array<{
          status: string;
          modelId: string | null;
          offeringFailures: Array<{ modelId: string }>;
        }>;
      };
    };

    expect(markdown).toContain("Models excluded by invocation limits");
    expect(markdown).toContain("`claude-haiku-4-5` · expected · context limit exceeded");
    expect(parsed.result.tasks[0]).toMatchObject({
      status: "active",
      modelId: "claude-sonnet-5",
      offeringFailures: [{ modelId: "claude-haiku-4-5" }],
    });
  });

  it("keeps api-analysis-v1 exports on the unchanged JSON v3 projection", () => {
    const legacyAnalyses: LegacyTaskAnalysis[] = analyses.map(toLegacyAnalysis);
    const legacyPlanning = compareProviderPlans(tasks, legacyAnalyses, plan.settings);
    const legacyContext: PlanExportContext = {
      ...context,
      plan: legacyPlanning.plans.openai,
      providerComparisons: legacyPlanning.comparisons,
      analysisContract: {
        contractVersion: "api-analysis-v1",
        compatibility: "legacy-api-only",
      },
      analysisModel: "mock-fixture-v1",
    };
    const json = createPlanJson(legacyContext, "2026-07-17T02:00:00.000Z");
    const parsed = JSON.parse(json) as {
      schemaVersion: number;
      allocationEligibilityBasis?: unknown;
    };

    expect(parsed.schemaVersion).toBe(LEGACY_PLAN_JSON_SCHEMA_VERSION);
    expect(json).not.toContain('"deadlineDate"');
    expect(json).not.toContain('"failureImpact"');
    expect(json).not.toContain('"requiredQualityTier"');
    expect(json).not.toContain('"workMode"');
    expect(parsed.allocationEligibilityBasis).toBeUndefined();
    const markdown = createPlanMarkdown(legacyContext, "en");
    expect(markdown).not.toContain("Analysis contract:");
    expect(markdown).not.toContain("Active does not mean confirmed Offering eligibility");
  });

  it("keeps legacy infeasibility invocation-only in UI projections and JSON v3", () => {
    const legacyLargeAnalysis: LegacyTaskAnalysis = toLegacyAnalysis({
      ...analyses[0],
      expectedIterations: 1,
      estimatedInputSize: "xl",
      estimatedOutputSize: "xl",
      recommendedModelTier: "economy",
    });
    const legacyPlanning = compareProviderPlans(
      [tasks[0]],
      [legacyLargeAnalysis],
      plan.settings,
    );
    const legacyContext: PlanExportContext = {
      ...context,
      sourceTasks: [tasks[0]],
      plan: legacyPlanning.plans.google,
      providerComparisons: legacyPlanning.comparisons,
      analysisContract: {
        contractVersion: "api-analysis-v1",
        compatibility: "legacy-api-only",
      },
      analysisModel: "mock-fixture-v1",
    };
    const parsed = JSON.parse(createPlanJson(legacyContext)) as {
      schemaVersion: number;
      allocationEligibilityBasis?: unknown;
      result: {
        warnings: string[];
        tasks: Array<{ status: string; infeasibleReason: string | null }>;
      };
    };
    const markdown = createPlanMarkdown(legacyContext, "en");

    expect(parsed.schemaVersion).toBe(LEGACY_PLAN_JSON_SCHEMA_VERSION);
    expect(parsed.allocationEligibilityBasis).toBeUndefined();
    expect(parsed.result.tasks[0]).toMatchObject({
      status: "infeasible",
      infeasibleReason: "no-compatible-offering",
    });
    expect(parsed.result.warnings.join(" ")).toContain("기존 분석 작업");
    expect(parsed.result.warnings.join(" ")).toContain("호출 한도");
    expect(parsed.result.warnings.join(" ")).not.toContain("최소 품질");
    expect(markdown).toContain("This legacy analysis has no minimum-quality threshold");
    expect(markdown.replaceAll("\\-", "-")).toContain(
      "no model supporting the lower-, likely-, and higher-use cases",
    );
    expect(markdown).not.toContain("No tier at or above the minimum quality");
  });

  it("rejects crossed discriminators and mixed task contracts in both export formats", () => {
    const crossedContext = {
      ...context,
      analysisContract: {
        contractVersion: "api-analysis-v1",
        compatibility: "best-fit",
      },
    } as unknown as PlanExportContext;
    const firstAnalysis = plan.tasks[0].analysis;
    const legacyFirstAnalysis: LegacyTaskAnalysis = {
      taskId: firstAnalysis.taskId,
      taskType: firstAnalysis.taskType,
      complexity: firstAnalysis.complexity,
      reasoningDepth: firstAnalysis.reasoningDepth,
      expectedIterations: firstAnalysis.expectedIterations,
      estimatedInputSize: firstAnalysis.estimatedInputSize,
      estimatedOutputSize: firstAnalysis.estimatedOutputSize,
      uncertainty: firstAnalysis.uncertainty,
      recommendedModelTier: firstAnalysis.recommendedModelTier,
      riskFactors: firstAnalysis.riskFactors,
      rationale: firstAnalysis.rationale,
    };
    const mixedContext: PlanExportContext = {
      ...context,
      plan: {
        ...plan,
        tasks: plan.tasks.map((task, index) =>
          index === 0 ? { ...task, analysis: legacyFirstAnalysis } : task,
        ),
      },
    };

    for (const invalidContext of [crossedContext, mixedContext]) {
      expect(() => createPlanJson(invalidContext)).toThrow(
        "The export analysis contract does not match the planned task analysis.",
      );
      expect(() => createPlanMarkdown(invalidContext)).toThrow(
        "The export analysis contract does not match the planned task analysis.",
      );
    }
  });

  it("preserves infeasible invocation reasons in Markdown and JSON without a High cost", () => {
    const largeAnalysis = {
      ...analyses[0],
      expectedIterations: 1,
      estimatedInputSize: "xl" as const,
      estimatedOutputSize: "xl" as const,
      recommendedModelTier: "economy" as const,
    };
    const infeasiblePlanning = compareProviderPlans([tasks[0]], [largeAnalysis], {
      budgetUsd: 5,
      deadlineDays: 7,
      strategy: "balanced",
    });
    const infeasibleContext: PlanExportContext = {
      ...context,
      sourceTasks: [tasks[0]],
      plan: infeasiblePlanning.plans.google,
      providerComparisons: infeasiblePlanning.comparisons,
    };
    const markdown = createPlanMarkdown(infeasibleContext, "en");
    const parsed = JSON.parse(createPlanJson(infeasibleContext)) as {
      allocationEligibilityBasis: {
        statusMeaning: string;
        requiredCapabilitiesApplied: boolean;
      };
      result: {
        infeasibleTaskCount: number;
        tasks: Array<{
          status: string;
          cost: unknown;
          infeasibleReason: string | null;
          offeringFailures: Array<{
            scenarios: Array<{
              failures: Array<{ code: string; actualTokens: number; limitTokens: number }>;
            }>;
          }> | null;
        }>;
      };
      comparison: {
        providers: Array<{
          providerId: string;
          allTasksActiveWithinBudget: boolean;
          infeasibleTaskCount: number;
        }>;
      };
    };
    const task = parsed.result.tasks[0];
    const google = parsed.comparison.providers.find(
      (provider) => provider.providerId === "google",
    );

    expect(markdown).toContain("| Higher use |");
    expect(markdown).toContain("| Infeasible |");
    expect(markdown).toContain("output limit exceeded (96,000 > 65,536)");
    expect(markdown).toContain("No tier at or above the minimum quality");
    expect(markdown).toContain("Work mode and required capabilities are checked separately in the plan above");
    expect(parsed.allocationEligibilityBasis).toEqual(
      expect.objectContaining({
        statusMeaning: "cost-projection-not-confirmed-offering-eligibility",
        requiredCapabilitiesApplied: false,
      }),
    );
    expect(task).toMatchObject({
      status: "infeasible",
      cost: null,
      infeasibleReason: "no-compatible-offering",
    });
    expect(task.offeringFailures).not.toBeNull();
    expect(
      task.offeringFailures?.some((offering) =>
        offering.scenarios.some((scenario) =>
          scenario.failures.some(
            (failure) =>
              failure.code === "output-limit-exceeded" &&
              failure.actualTokens === 96_000 &&
              failure.limitTokens === 65_536,
          ),
        ),
      ),
    ).toBe(true);
    expect(parsed.result.infeasibleTaskCount).toBe(1);
    expect(google).toMatchObject({
      allTasksActiveWithinBudget: false,
      infeasibleTaskCount: 1,
    });
  });
});
