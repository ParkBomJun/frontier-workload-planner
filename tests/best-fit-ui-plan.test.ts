import { describe, expect, it } from "vitest";

import { SAMPLE_TASKS_BY_LOCALE } from "@/data/examples";
import { createMockAnalysis } from "@/lib/ai/mock-response";
import { catalogOverrideTargetFor } from "@/lib/offerings/catalog-overrides";
import {
  buildBestFitUiPlan,
  hasBestFitRelevantSettingsChange,
  reconcileBestFitRelevantSettings,
  type BuildBestFitUiPlanInput,
} from "@/lib/planning/best-fit-ui-plan";
import {
  createAvailableAiResourceEvidenceObservedAt,
  createDefaultAvailableAiResourceDraft,
} from "@/lib/planning/resource-drafts";
import type { TaskInput } from "@/types/domain";

const PLANNING_AS_OF = "2026-07-18T12:00:00.000Z";

const task: TaskInput = {
  id: "task-1",
  name: "API 설계",
  description: "입력 검증이 있는 API를 설계한다.",
  priority: "high",
  deadlineDate: "2026-07-21",
  failureImpact: "high",
};

function planInput(): BuildBestFitUiPlanInput {
  return {
    tasks: [structuredClone(task)],
    analyses: [structuredClone(createMockAnalysis([task]).tasks[0])],
    strategy: "balanced",
    incrementalCashBudgetUsd: 5,
    planningAsOf: PLANNING_AS_OF,
    pricingAsOf: "2026-07-18",
    resourceEvidenceObservedAtById: {},
    resourceDrafts: [],
    apiOverrides: [],
  };
}

describe("Checkpoint 7 Best-fit UI planning coordinator", () => {
  it("produces usable confirmed routes for all three built-in sample tasks", () => {
    const tasks = structuredClone(SAMPLE_TASKS_BY_LOCALE.ko);
    const result = buildBestFitUiPlan({
      tasks,
      analyses: createMockAnalysis(tasks).tasks,
      strategy: "balanced",
      incrementalCashBudgetUsd: 5,
      planningAsOf: PLANNING_AS_OF,
      pricingAsOf: "2026-07-18",
      resourceEvidenceObservedAtById: {},
      resourceDrafts: [],
      apiOverrides: [],
    });

    expect(result.plan).toMatchObject({
      activeTaskCount: 3,
      heldTaskCount: 0,
      infeasibleTaskCount: 0,
    });
    expect(
      result.candidateSets.every(({ confirmedRoutes }) => confirmedRoutes.length > 0),
    ).toBe(true);
    expect(result.candidateSets[2]?.analysis.workMode).toBe("batch");
    expect(result.candidateSets[2]?.confirmedRoutes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          routeIdentity: expect.objectContaining({ resourceId: null }),
        }),
      ]),
    );
  });

  it("keeps the global reference deadline out of the Best-fit calculation clock", () => {
    const previous = {
      budgetUsd: 5,
      deadlineDays: 7,
      strategy: "balanced" as const,
    };

    expect(
      hasBestFitRelevantSettingsChange(previous, {
        ...previous,
        deadlineDays: 30,
      }),
    ).toBe(false);
    expect(
      hasBestFitRelevantSettingsChange(previous, {
        ...previous,
        budgetUsd: 6,
      }),
    ).toBe(true);
    expect(
      hasBestFitRelevantSettingsChange(previous, {
        ...previous,
        strategy: "quality-first",
      }),
    ).toBe(true);
    expect(
      hasBestFitRelevantSettingsChange(
        { budgetUsd: previous.budgetUsd, strategy: previous.strategy },
        { ...previous, deadlineDays: 1 },
      ),
    ).toBe(false);
  });

  it("remembers the last valid strategy across an invalid reference deadline", () => {
    const lastValid = { budgetUsd: 5, strategy: "balanced" as const };
    const invalidDeadline = reconcileBestFitRelevantSettings(lastValid, null);

    expect(invalidDeadline).toEqual({ changed: false, lastValid });

    const validAgain = reconcileBestFitRelevantSettings(
      invalidDeadline.lastValid,
      {
        budgetUsd: 5,
        deadlineDays: 30,
        strategy: "quality-first",
      },
    );
    expect(validAgain).toEqual({
      changed: true,
      lastValid: { budgetUsd: 5, strategy: "quality-first" },
    });
    expect(
      reconcileBestFitRelevantSettings(validAgain.lastValid, {
        budgetUsd: 5,
        deadlineDays: 7,
        strategy: "quality-first",
      }).changed,
    ).toBe(false);
  });

  it("uses confirmed public API facts while excluding incompatible routes", () => {
    const result = buildBestFitUiPlan(planInput());

    expect(result.plan.activeTaskCount).toBe(1);
    expect(result.plan.heldTaskCount).toBe(0);
    expect(result.plan.infeasibleTaskCount).toBe(0);
    expect(result.plan.tasks[0]).toMatchObject({
      status: "active",
      routeKind: "api",
    });
    expect(result.candidateSets[0]?.confirmedRoutes).toHaveLength(2);
    expect(result.candidateSets[0]?.excludedRoutes).toHaveLength(7);
  });

  it("preserves an opaque user resource as a conditional diagnostic", () => {
    const draft = createDefaultAvailableAiResourceDraft({
      uiId: "resource-1",
      presetId: "chatgpt-like-variable",
    });
    const input = planInput();
    input.resourceDrafts = [
      {
        ...draft,
        surface: "chat",
        feeUsd: "20",
        quota: {
          kind: "opaque",
          description: "Usage-dependent private limit",
        },
      },
    ];
    input.resourceEvidenceObservedAtById = {
      "resource-1": createAvailableAiResourceEvidenceObservedAt(PLANNING_AS_OF),
    };

    const result = buildBestFitUiPlan(input);

    expect(result.resourceDiagnostics).toEqual([
      expect.objectContaining({
        uiId: "resource-1",
        status: "conditional",
        reasonCodes: expect.arrayContaining(["quota-opaque"]),
      }),
    ]);
    expect(
      result.candidateSets[0]?.excludedRoutes.some(
        ({ routeIdentity }) => routeIdentity.resourceId !== null,
      ),
    ).toBe(true);
    expect(result.plan.activeTaskCount).toBe(1);
  });

  it("reports invalid resource drafts without dropping the rest of the plan", () => {
    const input = planInput();
    input.resourceDrafts = [
      createDefaultAvailableAiResourceDraft({
        uiId: "resource-1",
        presetId: "custom-subscription",
      }),
    ];
    input.resourceEvidenceObservedAtById = {
      "resource-1": createAvailableAiResourceEvidenceObservedAt(PLANNING_AS_OF),
    };

    const result = buildBestFitUiPlan(input);

    expect(result.resourceDiagnostics[0]).toMatchObject({
      status: "invalid",
      fieldErrors: expect.objectContaining({ feeUsd: "required" }),
    });
    expect(result.plan.activeTaskCount).toBe(1);
    expect(result.plan.infeasibleTaskCount).toBe(0);
  });

  it.each([
    {
      preset: { id: "retired-preset", version: "subscription-presets-v0" },
      reason: "preset-reference-unresolved",
      errorField: "preset.id",
    },
    {
      preset: {
        id: "chatgpt-like-variable",
        version: "subscription-presets-v0",
      },
      reason: "preset-version-mismatch",
      errorField: "preset.version",
    },
  ] as const)(
    "keeps a stale preset as a recoverable conditional exclusion: $reason",
    ({ preset, reason, errorField }) => {
      const input = planInput();
      input.resourceDrafts = [
        {
          ...createDefaultAvailableAiResourceDraft({
            uiId: "resource-1",
            presetId: "chatgpt-like-variable",
          }),
          preset,
          feeUsd: "20",
          quota: { kind: "opaque", description: "Private capacity" },
        },
      ];
      input.resourceEvidenceObservedAtById = {
        "resource-1": createAvailableAiResourceEvidenceObservedAt(
          PLANNING_AS_OF,
        ),
      };

      const result = buildBestFitUiPlan(input);

      expect(result.resourceDiagnostics[0]).toMatchObject({
        status: "conditional",
        routeIdentity: null,
        fieldErrors: { [errorField]: expect.any(String) },
        reasonCodes: [reason],
      });
      expect(result.candidateSets[0]?.confirmedRoutes).toHaveLength(2);
      expect(result.plan.activeTaskCount).toBe(1);
      expect(result.plan.infeasibleTaskCount).toBe(0);
    },
  );

  it("is deterministic for equivalent source inputs", () => {
    const first = buildBestFitUiPlan(planInput());
    const second = buildBestFitUiPlan(planInput());

    expect(second).toEqual(first);
  });

  it("applies a bounded catalog override without replacing provider evidence", () => {
    const input = planInput();
    input.apiOverrides = [
      {
        kind: "api-catalog-override",
        provenance: "user-supplied",
        target: catalogOverrideTargetFor("openai", "economy"),
        effectiveFrom: "2026-07-18",
        recordedAt: PLANNING_AS_OF,
        planningTier: "premium",
      },
    ];

    const result = buildBestFitUiPlan(input);
    const luna = result.candidateSets[0]?.confirmedRoutes.find(
      ({ routeIdentity }) =>
        routeIdentity.offeringId === "api.openai.gpt-5.6-luna.standard-text",
    );

    expect(luna).toMatchObject({
      modelId: "gpt-5.6-luna",
      qualityTier: "premium",
    });
    expect(result.plan.activeTaskCount).toBe(1);
  });

  it("ignores an unresolved historical override target without promoting it", () => {
    const baseline = buildBestFitUiPlan(planInput());
    const input = planInput();
    input.apiOverrides = [
      {
        kind: "api-catalog-override",
        provenance: "user-supplied",
        target: {
          ...catalogOverrideTargetFor("openai", "economy"),
          registryVersion: "retired-provider-registry-v0",
        },
        effectiveFrom: "2026-07-18",
        recordedAt: PLANNING_AS_OF,
        planningTier: "premium",
      },
    ];

    expect(buildBestFitUiPlan(input)).toEqual(baseline);
  });

  it("rejects an override that is future-dated for the restored pricing date", () => {
    const input = planInput();
    input.apiOverrides = [
      {
        kind: "api-catalog-override",
        provenance: "user-supplied",
        target: catalogOverrideTargetFor("openai", "economy"),
        effectiveFrom: "2026-07-19",
        recordedAt: "2026-07-20T12:00:00.000Z",
        planningTier: "premium",
      },
    ];

    expect(() => buildBestFitUiPlan(input)).toThrow(/scheduled for the future/);
  });

  it("rejects a mismatched analysis identity and invalid budget", () => {
    const source = planInput();
    const mismatched: BuildBestFitUiPlanInput = {
      ...source,
      analyses: [{ ...source.analyses[0], taskId: "other" }],
    };
    expect(() => buildBestFitUiPlan(mismatched)).toThrow(/ordered task/);

    expect(() =>
      buildBestFitUiPlan({ ...planInput(), incrementalCashBudgetUsd: 0 }),
    ).toThrow(/incremental-cash budget/);
  });

  it("rejects duplicate resource identities at the collection boundary", () => {
    const draft = createDefaultAvailableAiResourceDraft({
      uiId: "resource-1",
      presetId: "chatgpt-like-variable",
    });
    expect(() =>
      buildBestFitUiPlan({
        ...planInput(),
        resourceDrafts: [draft, structuredClone(draft)],
        resourceEvidenceObservedAtById: {
          "resource-1":
            createAvailableAiResourceEvidenceObservedAt(PLANNING_AS_OF),
        },
      }),
    ).toThrow(/unique resource draft/);
  });
});
