import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import recentScenarioV1 from "./fixtures/recent-scenario-v1.json";
import recentScenarioV2 from "./fixtures/recent-scenario-v2.json";
import recentScenarioV3 from "./fixtures/recent-scenario-v3.json";
import recentScenarioV4 from "./fixtures/recent-scenario-v4.json";
import recentScenarioV5 from "./fixtures/recent-scenario-v5.json";
import { createMockAnalysis } from "@/lib/ai/mock-response";
import { compareProviderPlans } from "@/lib/calculation/compare-providers";
import { evaluateApiOfferingCost } from "@/lib/calculation/evaluate-api-offering";
import {
  reconcileBestFitRelevantSettings,
} from "@/lib/planning/best-fit-ui-plan";
import {
  advancePlanningRevisionAt,
  resolveBestFitPlanningAsOf,
  resolveRestoredPlanningRevisionAt,
} from "@/lib/planning/planning-clock";
import {
  historicalRecentScenarioV1Schema,
  historicalRecentScenarioV2Schema,
  historicalRecentScenarioV3Schema,
  historicalRecentScenarioV4Schema,
  historicalRecentScenarioV5Schema,
} from "@/lib/storage/historical-schemas";
import {
  createEmptyBestFitSourceState,
  type BestFitSourceState,
} from "@/lib/storage/best-fit-sources";
import {
  clearRecentScenario,
  confirmIncrementalCashBudget,
  loadRecentScenario,
  RECENT_SCENARIO_STORAGE_KEY,
  saveRecentScenario,
} from "@/lib/storage/scenarios";
import type {
  AnalyzeSuccessResponse,
  PlanningSettings,
  StoredAnalysisSnapshot,
  TaskInput,
} from "@/types/domain";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

const tasks: TaskInput[] = [
  {
    id: "task-1",
    name: "API 설계",
    description: "입력 검증이 있는 API를 설계한다.",
    priority: "high",
    deadlineDate: "2026-07-21",
    failureImpact: "high",
  },
  {
    id: "task-2",
    name: "안내문",
    description: "짧은 안내문을 작성한다.",
    priority: "low",
    deadlineDate: null,
    failureImpact: "medium",
  },
];
const settings: PlanningSettings = {
  budgetUsd: 5,
  deadlineDays: 7,
  strategy: "balanced",
};
const response: AnalyzeSuccessResponse = {
  ok: true,
  mode: "mock",
  model: "mock-fixture-v2",
  generatedAt: "2026-07-17T01:00:00.000Z",
  analysis: createMockAnalysis(tasks),
};
const bestFitSnapshot: StoredAnalysisSnapshot = {
  contractVersion: "best-fit-analysis-v2",
  compatibility: "best-fit",
  response,
};
const savedAt = "2026-07-17T01:01:00.000Z";
const selectedProvider = "openai" as const;
const scenarioInput = {
  selectedProvider,
  tasks,
  settings,
  analysisSnapshot: bestFitSnapshot,
};
const unconfirmedSettings = {
  ...settings,
  incrementalCashBudget: {
    status: "legacy-api-only-unconfirmed" as const,
    legacyBudgetUsd: settings.budgetUsd,
  },
};
const emptyBestFitSources = createEmptyBestFitSourceState();
const populatedBestFitSources: BestFitSourceState = {
  contractVersion: "best-fit-source-state-v1",
  availableAiResources: {
    contractVersion: "available-ai-resource-sources-v1",
    drafts: [
      {
        uiId: "resource-1",
        preset: {
          id: "github-copilot-like-credits",
          version: "subscription-presets-v1",
        },
        displayName: "Owned coding credits",
        ownership: "owned",
        availability: "available",
        surface: "ide-cli",
        feeUsd: "10",
        quota: {
          kind: "metered",
          unit: "credit",
          included: "100",
          remaining: "42.5",
          consumption: {
            basis: "task",
            low: "1",
            expected: "2.5",
            high: "4",
            sampleSize: "8",
          },
        },
        reset: {
          kind: "fixed",
          cadenceDays: "30",
          nextResetAt: "2026-08-01T00:00:00.000Z",
        },
      },
    ],
    evidenceObservedAtById: {
      "resource-1": {
        availability: "2026-07-18T01:00:00.000Z",
        commitment: "2026-07-18T01:01:00.000Z",
        quota: "2026-07-18T01:02:00.000Z",
        reset: "2026-07-18T01:03:00.000Z",
        offering: "2026-07-18T01:04:00.000Z",
      },
    },
  },
  apiCatalogOverrides: {
    contractVersion: "api-catalog-override-sources-v1",
    overrides: [
      {
        kind: "api-catalog-override",
        provenance: "user-supplied",
        target: {
          registryId: "frontier-provider-api-catalog",
          registryVersion: "provider-comparison-stable-v2",
          entryId: "gpt-5.6-terra",
        },
        effectiveFrom: "2026-07-17",
        recordedAt: "2026-07-18T01:05:00.000Z",
        planningTier: "premium",
        standardTextPrice: {
          inputUsdPerMillion: 2.75,
          outputUsdPerMillion: 16,
        },
      },
    ],
  },
};

const goldenFiles = [
  {
    filename: "recent-scenario-v1.json",
    fixture: recentScenarioV1,
    schema: historicalRecentScenarioV1Schema,
    digest: "1e8efcd1a99a92aa91232df24e22281f62d9238fa59320f4b6964984feb70c54",
  },
  {
    filename: "recent-scenario-v2.json",
    fixture: recentScenarioV2,
    schema: historicalRecentScenarioV2Schema,
    digest: "8a4578723fb8b5eca3b6c6a3d5d0671d7c69581730ba5edf403910c29838f167",
  },
  {
    filename: "recent-scenario-v3.json",
    fixture: recentScenarioV3,
    schema: historicalRecentScenarioV3Schema,
    digest: "dff558e74569dc3df59274d1de956299f8e6b28e27a87fb79c9ec7be4bbcf949",
  },
  {
    filename: "recent-scenario-v4.json",
    fixture: recentScenarioV4,
    schema: historicalRecentScenarioV4Schema,
    digest: "dca7eac8e619e9c75cf72048a1067fd63a298cd2640027e5e2c1f8a8f492ee46",
  },
  {
    filename: "recent-scenario-v5.json",
    fixture: recentScenarioV5,
    schema: historicalRecentScenarioV5Schema,
    digest: "c7c408909c5a4a3927ac1aa26d9cc46961cc9a63dc9596f6002447dc1519a905",
  },
] as const;

function rawFixture(filename: string): string {
  return readFileSync(new URL(`./fixtures/${filename}`, import.meta.url), "utf8");
}

describe("frozen historical scenario contracts", () => {
  it.each(goldenFiles)("parses immutable $filename bytes and pins their digest", ({ filename, fixture, schema, digest }) => {
    const raw = rawFixture(filename);

    expect(createHash("sha256").update(raw).digest("hex")).toBe(digest);
    expect(schema.safeParse(fixture).success).toBe(true);
    if (fixture.schemaVersion < 4) {
      expect(raw).not.toContain("best-fit-analysis-v2");
      expect(raw).not.toContain("requiredQualityTier");
      expect(raw).not.toContain("failureRisk");
    } else {
      expect(raw).toContain("best-fit-analysis-v2");
      expect(raw).toContain("requiredQualityTier");
      expect(raw).toContain("failureRisk");
      if (fixture.schemaVersion === 4) {
        expect(raw).not.toContain("incrementalCashBudget");
      } else {
        expect(raw).toContain("incrementalCashBudget");
        expect(raw).not.toContain("bestFitSources");
      }
    }
  });

  it("does not import mutable live task, analysis, response, enum, or limit schemas", () => {
    const source = readFileSync(
      new URL("../src/lib/storage/historical-schemas.ts", import.meta.url),
      "utf8",
    );

    expect(source).not.toContain("@/lib/ai/schema");
    expect(source).not.toContain("@/types/domain");
    expect(source).not.toContain("taskInputSchema");
    expect(source).not.toContain("analysisDocumentSchema");
  });
});

describe("recent scenario storage v6", () => {
  it("round-trips one validated best-fit scenario", () => {
    const storage = new MemoryStorage();
    const saved = saveRecentScenario(scenarioInput, storage, savedAt);
    const loaded = loadRecentScenario(storage);

    expect(saved).toMatchObject({ ok: true });
    expect(loaded).toMatchObject({
      status: "loaded",
      scenario: {
        schemaVersion: 6,
        savedAt,
        selectedProvider,
        tasks,
        settings: unconfirmedSettings,
        analysisSnapshot: bestFitSnapshot,
        bestFitSources: emptyBestFitSources,
      },
    });
  });

  it("defaults an omitted incremental-cash field to an unconfirmed legacy API-only draft", () => {
    const storage = new MemoryStorage();

    const saved = saveRecentScenario(scenarioInput, storage, savedAt);

    expect(saved).toEqual({
      ok: true,
      scenario: expect.objectContaining({
        settings: unconfirmedSettings,
        bestFitSources: emptyBestFitSources,
      }),
    });
    expect(
      JSON.parse(storage.getItem(RECENT_SCENARIO_STORAGE_KEY) ?? "{}").settings,
    ).toEqual(unconfirmedSettings);
  });

  it("round-trips versioned resource drafts, observation times, and API overrides", () => {
    const storage = new MemoryStorage();

    const saved = saveRecentScenario(
      { ...scenarioInput, bestFitSources: populatedBestFitSources },
      storage,
      savedAt,
    );
    const loaded = loadRecentScenario(storage);

    expect(saved).toEqual({
      ok: true,
      scenario: expect.objectContaining({
        schemaVersion: 6,
        bestFitSources: populatedBestFitSources,
      }),
    });
    expect(loaded).toEqual({
      status: "loaded",
      scenario: expect.objectContaining({
        bestFitSources: populatedBestFitSources,
      }),
    });
    expect(
      JSON.parse(storage.getItem(RECENT_SCENARIO_STORAGE_KEY) ?? "{}").bestFitSources,
    ).toEqual(populatedBestFitSources);
  });

  it("preserves structurally valid in-progress resource drafts for later correction", () => {
    const storage = new MemoryStorage();
    const inProgressSources = structuredClone(populatedBestFitSources);
    const draft = inProgressSources.availableAiResources.drafts[0];
    if (!draft) throw new Error("The populated source fixture requires one draft.");
    draft.displayName = "";
    draft.surface = "";
    draft.feeUsd = "";
    if (draft.quota.kind !== "metered") {
      throw new Error("The populated source fixture requires metered quota.");
    }
    draft.quota.included = "not-a-number";
    draft.quota.remaining = "";

    expect(
      saveRecentScenario(
        { ...scenarioInput, bestFitSources: inProgressSources },
        storage,
        savedAt,
      ),
    ).toMatchObject({ ok: true });
    expect(loadRecentScenario(storage)).toMatchObject({
      status: "loaded",
      scenario: { bestFitSources: inProgressSources },
    });
  });

  it("preserves unresolved preset and registry versions as non-authoritative source", () => {
    const storage = new MemoryStorage();
    const unresolvedSources = structuredClone(populatedBestFitSources);
    const draft = unresolvedSources.availableAiResources.drafts[0];
    const override = unresolvedSources.apiCatalogOverrides.overrides[0];
    if (!draft || !override) {
      throw new Error("The populated source fixture requires a draft and override.");
    }
    draft.preset.id = "retired-preset";
    draft.preset.version = "subscription-presets-v0";
    override.target.registryVersion = "retired-provider-registry-v0";

    expect(
      saveRecentScenario(
        { ...scenarioInput, bestFitSources: unresolvedSources },
        storage,
        savedAt,
      ),
    ).toMatchObject({ ok: true });
    expect(loadRecentScenario(storage)).toMatchObject({
      status: "loaded",
      scenario: { bestFitSources: unresolvedSources },
    });
  });

  it("confirms total incremental cash only through the explicit pure helper", () => {
    const confirmedAt = "2026-07-17T01:03:00.000Z";
    const source = structuredClone(unconfirmedSettings);

    const confirmed = confirmIncrementalCashBudget(source, 6.25, confirmedAt);

    expect(confirmed).toEqual({
      ok: true,
      settings: {
        ...settings,
        incrementalCashBudget: {
          status: "confirmed",
          incrementalCashBudgetUsd: 6.25,
          confirmedAt,
        },
      },
    });
    expect(source).toEqual(unconfirmedSettings);

    if (!confirmed.ok) return;
    const storage = new MemoryStorage();
    expect(
      saveRecentScenario(
        { ...scenarioInput, settings: confirmed.settings },
        storage,
        savedAt,
      ),
    ).toMatchObject({
      ok: true,
      scenario: {
        settings: {
          budgetUsd: settings.budgetUsd,
          incrementalCashBudget: {
            status: "confirmed",
            incrementalCashBudgetUsd: 6.25,
            confirmedAt,
          },
        },
      },
    });
  });

  it("restores an invalid-deadline strategy change without rolling Sonnet pricing back", () => {
    const storage = new MemoryStorage();
    const generatedAt = "2026-08-31T23:50:00.000Z";
    const delayedAnalysisGeneratedAt = "2026-08-31T23:58:00.000Z";
    const confirmedAt = "2026-08-31T23:55:00.000Z";
    const restoredAt = "2026-09-01T00:05:00.000Z";
    const confirmed = confirmIncrementalCashBudget(
      settings,
      settings.budgetUsd,
      confirmedAt,
    );
    expect(confirmed.ok).toBe(true);
    if (!confirmed.ok) return;

    const invalidDeadline = reconcileBestFitRelevantSettings(
      { budgetUsd: settings.budgetUsd, strategy: settings.strategy },
      null,
    );
    const changedAfterBoundary = reconcileBestFitRelevantSettings(
      invalidDeadline.lastValid,
      {
        ...settings,
        strategy: "quality-first",
      },
    );
    expect(changedAfterBoundary.changed).toBe(true);

    expect(
      saveRecentScenario(
        {
          ...scenarioInput,
          settings: {
            ...confirmed.settings,
            strategy: changedAfterBoundary.lastValid.strategy,
          },
          analysisSnapshot: {
            ...bestFitSnapshot,
            response: { ...bestFitSnapshot.response, generatedAt },
          },
        },
        storage,
        "2026-09-01T00:01:00.000Z",
      ),
    ).toMatchObject({ ok: true });

    const loaded = loadRecentScenario(storage);
    expect(loaded.status).toBe("loaded");
    if (loaded.status !== "loaded") return;
    expect(loaded.scenario.settings.strategy).toBe("quality-first");

    const loadedBudget = loaded.scenario.settings.incrementalCashBudget;
    const restoredRevisionAt = resolveRestoredPlanningRevisionAt({
      restoredAt,
      generatedAt: loaded.scenario.analysisSnapshot.response.generatedAt,
      confirmedAt:
        loadedBudget.status === "confirmed" ? loadedBudget.confirmedAt : null,
    });
    const planningRevisionAt = advancePlanningRevisionAt(
      restoredRevisionAt,
      delayedAnalysisGeneratedAt,
    );
    const planningAsOf = resolveBestFitPlanningAsOf({
      revisionAt: planningRevisionAt,
      resourceEvidenceObservedAt: [],
      overrideRecordedAt: [],
      generatedAt: delayedAnalysisGeneratedAt,
      confirmedAt:
        loadedBudget.status === "confirmed" ? loadedBudget.confirmedAt : null,
    });
    if (planningAsOf === null) throw new Error("Restored planning clock is required.");
    const pricingAsOf = planningAsOf.slice(0, 10);
    expect(planningRevisionAt).toBe(restoredAt);
    expect(planningAsOf).toBe(restoredAt);
    expect(pricingAsOf).toBe("2026-09-01");

    const analysis = loaded.scenario.analysisSnapshot.response.analysis.tasks[0];
    if (!analysis) throw new Error("Restored scenario must preserve its first analysis.");
    const beforeRestore = evaluateApiOfferingCost({
      providerId: "anthropic",
      tier: "balanced",
      analysis,
      pricingAsOf: generatedAt.slice(0, 10),
    });
    const afterRestore = evaluateApiOfferingCost({
      providerId: "anthropic",
      tier: "balanced",
      analysis,
      pricingAsOf,
    });
    expect(beforeRestore).toMatchObject({
      status: "priced",
      pricing: {
        effectiveValue: {
          standardTextPrice: { inputUsdPerMillion: 2, outputUsdPerMillion: 10 },
        },
      },
    });
    expect(afterRestore).toMatchObject({
      status: "priced",
      pricing: {
        effectiveValue: {
          standardTextPrice: { inputUsdPerMillion: 3, outputUsdPerMillion: 15 },
        },
      },
    });
    if (beforeRestore.status !== "priced" || afterRestore.status !== "priced") return;
    expect(beforeRestore.scenarioCostMicroUsd.expected).toBe(144_000);
    expect(afterRestore.scenarioCostMicroUsd.expected).toBe(216_000);
  });

  it("rejects invalid confirmation and mismatched unconfirmed legacy amounts", () => {
    expect(
      confirmIncrementalCashBudget(settings, 5, "2026-07-17"),
    ).toEqual({ ok: false, reason: "invalid" });
    expect(
      confirmIncrementalCashBudget(settings, 0, "2026-07-17T01:03:00.000Z"),
    ).toEqual({ ok: false, reason: "invalid" });

    const storage = new MemoryStorage();
    expect(
      saveRecentScenario(
        {
          ...scenarioInput,
          settings: {
            ...settings,
            incrementalCashBudget: {
              status: "legacy-api-only-unconfirmed",
              legacyBudgetUsd: settings.budgetUsd + 1,
            },
          },
        },
        storage,
        savedAt,
      ),
    ).toEqual({ ok: false, reason: "invalid" });
    expect(storage.getItem(RECENT_SCENARIO_STORAGE_KEY)).toBeNull();
  });

  it("overwrites only the single source-state record", () => {
    const storage = new MemoryStorage();
    saveRecentScenario(scenarioInput, storage, savedAt);
    const renamedTasks = tasks.map((task, index) =>
      index === 0 ? { ...task, name: "수정된 API 설계" } : task,
    );
    const renamedResponse = { ...response, analysis: createMockAnalysis(renamedTasks) };
    saveRecentScenario(
      {
        selectedProvider: "google",
        tasks: renamedTasks,
        settings,
        analysisSnapshot: {
          contractVersion: "best-fit-analysis-v2",
          compatibility: "best-fit",
          response: renamedResponse,
        },
      },
      storage,
      "2026-07-17T01:02:00.000Z",
    );

    const loaded = loadRecentScenario(storage);
    expect(loaded.status).toBe("loaded");
    if (loaded.status === "loaded") {
      expect(loaded.scenario.tasks[0].name).toBe("수정된 API 설계");
      expect(loaded.scenario.selectedProvider).toBe("google");
    }
  });

  it("returns empty when no recent scenario exists", () => {
    expect(loadRecentScenario(new MemoryStorage())).toEqual({ status: "empty" });
  });

  it("discards malformed JSON and an identity-mismatched current record", () => {
    const malformedStorage = new MemoryStorage();
    malformedStorage.setItem(RECENT_SCENARIO_STORAGE_KEY, "{not-json");
    expect(loadRecentScenario(malformedStorage)).toEqual({ status: "discarded" });
    expect(malformedStorage.getItem(RECENT_SCENARIO_STORAGE_KEY)).toBeNull();

    const mismatchedStorage = new MemoryStorage();
    saveRecentScenario(scenarioInput, mismatchedStorage, savedAt);
    const raw = JSON.parse(mismatchedStorage.getItem(RECENT_SCENARIO_STORAGE_KEY) ?? "{}") as {
      analysisSnapshot: { response: AnalyzeSuccessResponse };
    };
    raw.analysisSnapshot.response.analysis.tasks[0].taskId = "wrong-id";
    mismatchedStorage.setItem(RECENT_SCENARIO_STORAGE_KEY, JSON.stringify(raw));

    expect(loadRecentScenario(mismatchedStorage)).toEqual({ status: "discarded" });
    expect(mismatchedStorage.getItem(RECENT_SCENARIO_STORAGE_KEY)).toBeNull();
  });

  it("rejects structurally invalid source state before writing", () => {
    const storage = new MemoryStorage();
    const mismatchedSources = structuredClone(populatedBestFitSources);
    mismatchedSources.availableAiResources.evidenceObservedAtById = {};

    expect(
      saveRecentScenario(
        { ...scenarioInput, bestFitSources: mismatchedSources },
        storage,
        savedAt,
      ),
    ).toEqual({ ok: false, reason: "invalid" });
    expect(storage.getItem(RECENT_SCENARIO_STORAGE_KEY)).toBeNull();

    const invalidTimestampSources = structuredClone(populatedBestFitSources);
    invalidTimestampSources.availableAiResources.evidenceObservedAtById[
      "resource-1"
    ]!.quota = "2026-07-18";
    expect(
      saveRecentScenario(
        { ...scenarioInput, bestFitSources: invalidTimestampSources },
        storage,
        savedAt,
      ),
    ).toEqual({ ok: false, reason: "invalid" });
    expect(storage.getItem(RECENT_SCENARIO_STORAGE_KEY)).toBeNull();
  });

  it("rejects imported resolved-evidence and official-default audit snapshots", () => {
    const resolvedEvidenceStorage = new MemoryStorage();
    expect(
      saveRecentScenario(
        { ...scenarioInput, bestFitSources: populatedBestFitSources },
        resolvedEvidenceStorage,
        savedAt,
      ),
    ).toMatchObject({ ok: true });
    const resolvedEvidenceRecord = JSON.parse(
      resolvedEvidenceStorage.getItem(RECENT_SCENARIO_STORAGE_KEY) ?? "{}",
    ) as {
      bestFitSources: {
        availableAiResources: { drafts: Array<Record<string, unknown>> };
      };
    };
    const storedDraft =
      resolvedEvidenceRecord.bestFitSources.availableAiResources.drafts[0];
    if (!storedDraft) throw new Error("The stored scenario requires one resource draft.");
    storedDraft.resolvedEvidence = {
      kind: "provider-published",
      authority: "allowlisted-registry-resolver",
      sourceUrl: "https://example.invalid/audit-only",
    };
    resolvedEvidenceStorage.setItem(
      RECENT_SCENARIO_STORAGE_KEY,
      JSON.stringify(resolvedEvidenceRecord),
    );

    expect(loadRecentScenario(resolvedEvidenceStorage)).toEqual({
      status: "discarded",
    });
    expect(
      resolvedEvidenceStorage.getItem(RECENT_SCENARIO_STORAGE_KEY),
    ).toBeNull();

    const officialDefaultStorage = new MemoryStorage();
    expect(
      saveRecentScenario(
        { ...scenarioInput, bestFitSources: populatedBestFitSources },
        officialDefaultStorage,
        savedAt,
      ),
    ).toMatchObject({ ok: true });
    const officialDefaultRecord = JSON.parse(
      officialDefaultStorage.getItem(RECENT_SCENARIO_STORAGE_KEY) ?? "{}",
    ) as {
      bestFitSources: {
        apiCatalogOverrides: { overrides: Array<Record<string, unknown>> };
      };
    };
    const storedOverride =
      officialDefaultRecord.bestFitSources.apiCatalogOverrides.overrides[0];
    if (!storedOverride) throw new Error("The stored scenario requires one API override.");
    storedOverride.officialDefault = {
      provenance: "verified-default",
      evidence: {
        kind: "provider-published",
        authority: "allowlisted-registry-resolver",
      },
    };
    officialDefaultStorage.setItem(
      RECENT_SCENARIO_STORAGE_KEY,
      JSON.stringify(officialDefaultRecord),
    );

    expect(loadRecentScenario(officialDefaultStorage)).toEqual({
      status: "discarded",
    });
    expect(officialDefaultStorage.getItem(RECENT_SCENARIO_STORAGE_KEY)).toBeNull();
  });

  it("preserves an unknown future version", () => {
    const storage = new MemoryStorage();
    const future = JSON.stringify({ schemaVersion: 7, future: true });
    storage.setItem(RECENT_SCENARIO_STORAGE_KEY, future);

    expect(loadRecentScenario(storage)).toEqual({ status: "unsupported" });
    expect(storage.getItem(RECENT_SCENARIO_STORAGE_KEY)).toBe(future);
  });

  it("discards invalid non-future versions", () => {
    for (const schemaVersion of [0, -1, 5.5, "6"]) {
      const storage = new MemoryStorage();
      storage.setItem(
        RECENT_SCENARIO_STORAGE_KEY,
        JSON.stringify({ schemaVersion, future: false }),
      );

      expect(loadRecentScenario(storage)).toEqual({ status: "discarded" });
      expect(storage.getItem(RECENT_SCENARIO_STORAGE_KEY)).toBeNull();
    }
  });

  it.each(goldenFiles)("migrates $filename sequentially to v6 with empty Best-fit sources", ({ fixture }) => {
    const storage = new MemoryStorage();
    const originalSnapshot = "analysisSnapshot" in fixture
      ? structuredClone(fixture.analysisSnapshot)
      : {
          contractVersion: "api-analysis-v1" as const,
          compatibility: "legacy-api-only" as const,
          response: structuredClone(fixture.response),
        };
    const expectedIncrementalCashBudget =
      "incrementalCashBudget" in fixture.settings
        ? structuredClone(fixture.settings.incrementalCashBudget)
        : {
            status: "legacy-api-only-unconfirmed" as const,
            legacyBudgetUsd: fixture.settings.budgetUsd,
          };
    storage.setItem(RECENT_SCENARIO_STORAGE_KEY, JSON.stringify(fixture));

    const loaded = loadRecentScenario(storage);

    expect(loaded.status).toBe("loaded");
    if (loaded.status !== "loaded") return;
    expect(loaded.scenario.schemaVersion).toBe(6);
    expect(loaded.scenario.analysisSnapshot).toEqual(originalSnapshot);
    expect(loaded.scenario.settings.incrementalCashBudget).toEqual(
      expectedIncrementalCashBudget,
    );
    expect(loaded.scenario.settings.budgetUsd).toBe(fixture.settings.budgetUsd);
    expect(loaded.scenario.bestFitSources).toEqual(emptyBestFitSources);
    if (fixture.schemaVersion < 4) {
      expect(loaded.scenario.tasks.every((task) => task.deadlineDate === null)).toBe(true);
      expect(loaded.scenario.tasks.every((task) => task.failureImpact === "unspecified")).toBe(true);
      expect(JSON.stringify(loaded.scenario.analysisSnapshot)).not.toContain("requiredQualityTier");
    } else {
      expect(loaded.scenario.tasks).toEqual(fixture.tasks);
      expect(JSON.stringify(loaded.scenario.analysisSnapshot)).toContain("requiredQualityTier");
    }
    expect(JSON.parse(storage.getItem(RECENT_SCENARIO_STORAGE_KEY) ?? "{}")).toMatchObject({
      schemaVersion: 6,
      settings: {
        budgetUsd: fixture.settings.budgetUsd,
        incrementalCashBudget: expectedIncrementalCashBudget,
      },
      bestFitSources: emptyBestFitSources,
    });

    if (fixture.schemaVersion === 1) {
      expect(loaded.scenario.tasks.map((task) => task.priority)).toEqual(["medium"]);
      expect(loaded.scenario.selectedProvider).toBe("openai");
    } else if (fixture.schemaVersion === 2) {
      expect(loaded.scenario.selectedProvider).toBe("openai");
    } else if (fixture.schemaVersion === 3) {
      expect(loaded.scenario.selectedProvider).toBe("anthropic");
    } else if (fixture.schemaVersion === 4) {
      expect(loaded.scenario.selectedProvider).toBe("google");
    } else {
      expect(loaded.scenario.selectedProvider).toBe("anthropic");
    }
  });

  it.each(["adaptation-failed", "target-validation-failed"] as const)(
    "preserves valid v5 bytes when migration reports %s",
    (reason) => {
      const storage = new MemoryStorage();
      const raw = rawFixture("recent-scenario-v5.json");
      storage.setItem(RECENT_SCENARIO_STORAGE_KEY, raw);

      expect(
        loadRecentScenario(storage, {
          migrateHistoricalScenario: () => ({ ok: false, reason }),
        }),
      ).toEqual({ status: "migration-required", reason });
      expect(storage.getItem(RECENT_SCENARIO_STORAGE_KEY)).toBe(raw);
    },
  );

  it("revalidates a successful adapter result before replacing legacy bytes", () => {
    const storage = new MemoryStorage();
    const raw = rawFixture("recent-scenario-v5.json");
    storage.setItem(RECENT_SCENARIO_STORAGE_KEY, raw);

    expect(
      loadRecentScenario(storage, {
        migrateHistoricalScenario: () => ({
          ok: true,
          scenario: { schemaVersion: 6 } as never,
        }),
      }),
    ).toEqual({ status: "migration-required", reason: "target-validation-failed" });
    expect(storage.getItem(RECENT_SCENARIO_STORAGE_KEY)).toBe(raw);
  });

  it("restores a validated migration in memory while preserving bytes when rewrite fails", () => {
    const raw = rawFixture("recent-scenario-v5.json");
    const storage = {
      getItem: () => raw,
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: () => undefined,
    };

    const loaded = loadRecentScenario(storage);

    expect(loaded.status).toBe("loaded");
    if (loaded.status === "loaded") {
      expect(loaded.scenario.analysisSnapshot.compatibility).toBe("best-fit");
      expect(loaded.scenario.settings.incrementalCashBudget).toEqual(
        recentScenarioV5.settings.incrementalCashBudget,
      );
      expect(loaded.scenario.bestFitSources).toEqual(emptyBestFitSources);
    }
    expect(storage.getItem()).toBe(raw);
  });

  it.each(goldenFiles)("removes a malformed declared historical $filename record", ({ fixture }) => {
    const storage = new MemoryStorage();
    const damaged = structuredClone(fixture) as {
      response?: { analysis: { tasks: Array<{ taskId: string }> } };
      analysisSnapshot?: {
        response: { analysis: { tasks: Array<{ taskId: string }> } };
      };
    };
    const analyses = damaged.analysisSnapshot?.response.analysis.tasks ??
      damaged.response?.analysis.tasks;
    if (!analyses) throw new Error("Historical fixture must contain an analysis response.");
    analyses[0].taskId = "wrong-id";
    storage.setItem(RECENT_SCENARIO_STORAGE_KEY, JSON.stringify(damaged));

    expect(loadRecentScenario(storage)).toEqual({ status: "discarded" });
    expect(storage.getItem(RECENT_SCENARIO_STORAGE_KEY)).toBeNull();
  });

  it("keeps a migrated legacy snapshot through source-state edits and only explicit reanalysis replaces it", () => {
    const storage = new MemoryStorage();
    storage.setItem(RECENT_SCENARIO_STORAGE_KEY, JSON.stringify(recentScenarioV3));
    const migrated = loadRecentScenario(storage);
    expect(migrated.status).toBe("loaded");
    if (migrated.status !== "loaded") return;

    const editedTasks = migrated.scenario.tasks.map((task) => ({
      ...task,
      priority: "medium" as const,
    }));
    expect(
      saveRecentScenario(
        {
          selectedProvider: "google",
          tasks: editedTasks,
          settings: migrated.scenario.settings,
          analysisSnapshot: migrated.scenario.analysisSnapshot,
        },
        storage,
        savedAt,
      ),
    ).toMatchObject({
      ok: true,
      scenario: { analysisSnapshot: { compatibility: "legacy-api-only" } },
    });

    expect(saveRecentScenario(scenarioInput, storage, savedAt)).toMatchObject({
      ok: true,
      scenario: { analysisSnapshot: { compatibility: "best-fit" } },
    });
  });

  it("preserves legacy API-only allocation parity after migration", () => {
    const storage = new MemoryStorage();
    storage.setItem(RECENT_SCENARIO_STORAGE_KEY, JSON.stringify(recentScenarioV3));
    const loaded = loadRecentScenario(storage);
    expect(loaded.status).toBe("loaded");
    if (loaded.status !== "loaded") return;

    const snapshot = loaded.scenario.analysisSnapshot;
    expect(snapshot.compatibility).toBe("legacy-api-only");
    const plan = compareProviderPlans(
      loaded.scenario.tasks,
      snapshot.response.analysis.tasks,
      loaded.scenario.settings,
    ).plans.anthropic;

    expect(plan.tasks[0]).toMatchObject({
      status: "active",
      assignedTier: "balanced",
      modelId: "claude-sonnet-5",
    });
    expect(plan.totals.expectedUsd).toBe(0.144);
  });

  it("persists only source fields and never derived allocation state", () => {
    const storage = new MemoryStorage();
    saveRecentScenario(scenarioInput, storage, savedAt);

    const raw = JSON.parse(storage.getItem(RECENT_SCENARIO_STORAGE_KEY) ?? "{}") as {
      tasks: Array<Record<string, unknown>>;
      [key: string]: unknown;
    };
    expect(Object.keys(raw).sort()).toEqual([
      "analysisSnapshot",
      "bestFitSources",
      "savedAt",
      "schemaVersion",
      "selectedProvider",
      "settings",
      "tasks",
    ]);
    expect(Object.keys(raw.tasks[0]).sort()).toEqual([
      "deadlineDate",
      "description",
      "failureImpact",
      "id",
      "name",
      "priority",
    ]);
    expect(JSON.stringify(raw)).not.toContain('"held"');
    expect(JSON.stringify(raw)).not.toContain('"assignedTier"');
    expect(JSON.stringify(raw)).not.toContain('"providerComparisons"');
    expect(JSON.stringify(raw)).not.toContain('"provider-published"');
    expect(JSON.stringify(raw)).not.toContain('"verified-connector-snapshot"');
    expect(raw.bestFitSources).toEqual(emptyBestFitSources);
  });

  it("rejects invalid input before writing", () => {
    const storage = new MemoryStorage();
    const duplicateTasks = [{ ...tasks[0] }, { ...tasks[1], id: tasks[0].id }];
    const saved = saveRecentScenario(
      { ...scenarioInput, tasks: duplicateTasks },
      storage,
      savedAt,
    );

    expect(saved).toEqual({ ok: false, reason: "invalid" });
    expect(storage.getItem(RECENT_SCENARIO_STORAGE_KEY)).toBeNull();
  });

  it("contains storage access failures and supports explicit clearing", () => {
    const getFailure = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => undefined,
      removeItem: () => undefined,
    };
    expect(loadRecentScenario(getFailure)).toEqual({ status: "unavailable" });

    const setFailure = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: () => undefined,
    };
    expect(saveRecentScenario(scenarioInput, setFailure, savedAt)).toEqual({
      ok: false,
      reason: "write-failed",
    });

    const removeFailure = {
      getItem: () => "{bad-json",
      setItem: () => undefined,
      removeItem: () => {
        throw new Error("blocked cleanup");
      },
    };
    expect(loadRecentScenario(removeFailure)).toEqual({ status: "discarded" });
    expect(clearRecentScenario(removeFailure)).toBe(false);

    const storage = new MemoryStorage();
    saveRecentScenario(scenarioInput, storage, savedAt);
    expect(clearRecentScenario(storage)).toBe(true);
    expect(loadRecentScenario(storage)).toEqual({ status: "empty" });
  });
});
