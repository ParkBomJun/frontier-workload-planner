import { describe, expect, it } from "vitest";

import { createMockAnalysis } from "@/lib/ai/mock-response";
import { compareProviderPlans } from "@/lib/calculation/compare-providers";
import { PLAN_JSON_SCHEMA_VERSION, createPlanJson } from "@/lib/export/json";
import { createPlanMarkdown } from "@/lib/export/markdown";
import type { PlanExportContext, TaskInput } from "@/types/domain";

const tasks: TaskInput[] = [
  {
    id: "task-1",
    name: "API | 설계\\검토",
    description: "첫 줄\n둘째 | 줄",
    priority: "high",
  },
  {
    id: "task-2",
    name: "출시 안내문",
    description: "사용자를 위한 안내문을 작성한다.",
    priority: "low",
  },
];
const analyses = createMockAnalysis(tasks).tasks;
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
  analysisModel: "mock-fixture-v1",
  generatedAt: "2026-07-17T01:00:00.000Z",
};
const constrainedPlanning = compareProviderPlans(tasks, analyses, {
  budgetUsd: plan.tasks[0].minimumExpectedCostUsd,
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
    expect(markdown).toContain("Low | Expected | High");
    expect(markdown).toContain("## 공급자별 비교");
    expect(markdown).toContain("OpenAI · GPT-5.6");
    expect(markdown).toContain("Anthropic · Claude");
    expect(markdown).toContain("Google · Gemini 3");
    expect(markdown).toContain("https://developers.openai.com/api/docs/pricing");
    expect(markdown).toContain("https://platform.claude.com/docs/en/about-claude/pricing");
    expect(markdown).toContain("https://ai.google.dev/gemini-api/docs/pricing");
    expect(markdown).toContain("2026-08-31까지 현재 가격");
    expect(markdown).toContain("Preview");
    expect(markdown).toContain("prompt 200,000토큰 이하 가격");
    expect(markdown).toContain("캐시 쓰기·적중, Batch 할인, 도구 호출비, 장문 구간 할증");
    expect(markdown).toContain("객관적 품질 순위가 아닙니다");
    expect(markdown).toContain("Mock 모드는 저장된 fixture를 사용합니다.");
    expect(markdown).toContain("Claude와 Gemini API는 호출하지 않습니다.");
    expect(createPlanMarkdown(context)).toBe(markdown);
    expect(createPlanMarkdown(context, "ko")).toBe(markdown);
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
    expect(markdown).toContain("Reason for hold: The all-Economy minimum exceeded the budget");
    expect(markdown).toContain("A stored Mock fixture provides the structured analysis");
    expect(markdown).toContain(
      "GPT-5.6 is the only Live analysis engine; Claude and Gemini APIs are not called.",
    );
    expect(markdown).toContain("Tier mappings are budget-planning heuristics");
    expect(markdown).toContain("They do not claim objective quality equivalence");
    expect(markdown).toContain("Cache writes and hits, Batch discounts, tool-call fees");
    expect(markdown).toContain("standard-uncached-text");
    expect(markdown).toContain("`cache-discounts-and-writes`");
    expect(markdown).toContain("`claude-sonnet-5`");
    expect(markdown).toContain("Low | Expected | High");
    expect(markdown).toContain("USD");
    expect(markdown).toContain("https://ai.google.dev/gemini-api/docs/pricing");
    expect(markdown).toContain("첫 줄<br>둘째 \\| 줄");
    expect(markdown).toContain(analyses[0].rationale);
    expect(markdown).not.toContain("## 공급자별 비교");
    expect(createPlanMarkdown(constrainedContext, "en")).toBe(markdown);
  });

  it("localizes Japanese labels and distinguishes Live analysis from Mock", () => {
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
    expect(markdown).toContain("保留理由: 全タスクのEconomy最小コストが予算を超えたため");
    expect(markdown).toContain("GPT-5.6がタスクを1回だけ分析し");
    expect(markdown).toContain("Live分析はGPT-5.6のみが行い、ClaudeとGemini APIは呼び出しません。");
    expect(markdown).not.toContain("Mockモードは保存済みfixtureを使用します。");
    expect(markdown).toContain("予算計画用ヒューリスティック");
    expect(markdown).toContain("客観的な品質の同等性、優劣");
    expect(markdown).toContain("キャッシュの書き込み・ヒット、Batch割引");
    expect(markdown).toContain("`gemini-3.1-pro-preview`");
    expect(markdown).toContain("Low | Expected | High");
    expect(markdown).toContain("USD");
    expect(markdown).toContain("https://platform.claude.com/docs/en/about-claude/pricing");
    expect(markdown).toContain("첫 줄<br>둘째 \\| 줄");
    expect(markdown).toContain(analyses[0].rationale);
    expect(markdown).not.toContain("## 가격과 계산 가정");
    expect(createPlanMarkdown(liveContext, "ja")).toBe(markdown);
  });
});

describe("plan JSON export", () => {
  it("produces a parseable v3 projection with comparisons and pricing assumptions", () => {
    const exportedAt = "2026-07-17T01:02:00.000Z";
    const json = createPlanJson(context, exportedAt);
    const parsed = JSON.parse(json) as {
      schemaVersion: number;
      comparison: { providers: Array<{ providerId: string }> };
      pricing: { catalog: Record<string, unknown> };
    } & Record<string, unknown>;

    expect(parsed).toMatchObject({
      schemaVersion: PLAN_JSON_SCHEMA_VERSION,
      exportedAt,
      product: "Frontier Workload Planner",
      analysis: {
        mode: "mock",
        model: "mock-fixture-v1",
        generatedAt: context.generatedAt,
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
    expect(parsed.comparison.providers.map(({ providerId }) => providerId)).toEqual([
      "openai",
      "anthropic",
      "google",
    ]);
    expect(parsed.pricing.catalog).toMatchObject({
      openai: {
        verifiedAt: "2026-07-17",
        pricingSource: "https://developers.openai.com/api/docs/pricing",
        models: {
          economy: {
            catalogId: "gpt-5.6-luna",
            inputUsdPerMillion: 1,
            outputUsdPerMillion: 6,
          },
        },
      },
      anthropic: {
        verifiedAt: "2026-07-17",
        models: {
          balanced: {
            catalogId: "claude-sonnet-5",
            effectiveThrough: "2026-08-31",
          },
        },
      },
      google: {
        verifiedAt: "2026-07-17",
        models: {
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

  it("exports held work as an explicit null allocation in schema v3", () => {
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

    expect(parsed.schemaVersion).toBe(3);
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
});
