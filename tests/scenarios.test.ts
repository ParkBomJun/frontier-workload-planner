import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import recentScenarioV1 from "./fixtures/recent-scenario-v1.json";
import recentScenarioV2 from "./fixtures/recent-scenario-v2.json";
import recentScenarioV3 from "./fixtures/recent-scenario-v3.json";
import { createMockAnalysis } from "@/lib/ai/mock-response";
import { compareProviderPlans } from "@/lib/calculation/compare-providers";
import {
  historicalRecentScenarioV1Schema,
  historicalRecentScenarioV2Schema,
  historicalRecentScenarioV3Schema,
} from "@/lib/storage/historical-schemas";
import {
  clearRecentScenario,
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
] as const;

function rawFixture(filename: string): string {
  return readFileSync(new URL(`./fixtures/${filename}`, import.meta.url), "utf8");
}

describe("frozen historical scenario contracts", () => {
  it.each(goldenFiles)("parses immutable $filename bytes and pins their digest", ({ filename, fixture, schema, digest }) => {
    const raw = rawFixture(filename);

    expect(createHash("sha256").update(raw).digest("hex")).toBe(digest);
    expect(schema.safeParse(fixture).success).toBe(true);
    expect(raw).not.toContain("best-fit-analysis-v2");
    expect(raw).not.toContain("requiredQualityTier");
    expect(raw).not.toContain("failureRisk");
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

describe("recent scenario storage v4", () => {
  it("round-trips one validated best-fit scenario", () => {
    const storage = new MemoryStorage();
    const saved = saveRecentScenario(scenarioInput, storage, savedAt);
    const loaded = loadRecentScenario(storage);

    expect(saved).toMatchObject({ ok: true });
    expect(loaded).toMatchObject({
      status: "loaded",
      scenario: {
        schemaVersion: 4,
        savedAt,
        selectedProvider,
        tasks,
        settings,
        analysisSnapshot: bestFitSnapshot,
      },
    });
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

  it("preserves an unknown future version", () => {
    const storage = new MemoryStorage();
    const future = JSON.stringify({ schemaVersion: 5, future: true });
    storage.setItem(RECENT_SCENARIO_STORAGE_KEY, future);

    expect(loadRecentScenario(storage)).toEqual({ status: "unsupported" });
    expect(storage.getItem(RECENT_SCENARIO_STORAGE_KEY)).toBe(future);
  });

  it("discards invalid non-future versions", () => {
    for (const schemaVersion of [0, -1, 3.5, "4"]) {
      const storage = new MemoryStorage();
      storage.setItem(
        RECENT_SCENARIO_STORAGE_KEY,
        JSON.stringify({ schemaVersion, future: false }),
      );

      expect(loadRecentScenario(storage)).toEqual({ status: "discarded" });
      expect(storage.getItem(RECENT_SCENARIO_STORAGE_KEY)).toBeNull();
    }
  });

  it.each(goldenFiles)("migrates $filename sequentially to a legacy API-only v4 snapshot", ({ fixture }) => {
    const storage = new MemoryStorage();
    const originalResponse = structuredClone(fixture.response);
    storage.setItem(RECENT_SCENARIO_STORAGE_KEY, JSON.stringify(fixture));

    const loaded = loadRecentScenario(storage);

    expect(loaded.status).toBe("loaded");
    if (loaded.status !== "loaded") return;
    expect(loaded.scenario.schemaVersion).toBe(4);
    expect(loaded.scenario.analysisSnapshot).toEqual({
      contractVersion: "api-analysis-v1",
      compatibility: "legacy-api-only",
      response: originalResponse,
    });
    expect(loaded.scenario.tasks.every((task) => task.deadlineDate === null)).toBe(true);
    expect(loaded.scenario.tasks.every((task) => task.failureImpact === "unspecified")).toBe(true);
    expect(JSON.stringify(loaded.scenario.analysisSnapshot)).not.toContain("requiredQualityTier");
    expect(JSON.parse(storage.getItem(RECENT_SCENARIO_STORAGE_KEY) ?? "{}")).toMatchObject({
      schemaVersion: 4,
      analysisSnapshot: { compatibility: "legacy-api-only" },
    });

    if (fixture.schemaVersion === 1) {
      expect(loaded.scenario.tasks.map((task) => task.priority)).toEqual(["medium"]);
      expect(loaded.scenario.selectedProvider).toBe("openai");
    } else if (fixture.schemaVersion === 2) {
      expect(loaded.scenario.selectedProvider).toBe("openai");
    } else {
      expect(loaded.scenario.selectedProvider).toBe("anthropic");
    }
  });

  it.each(["adaptation-failed", "target-validation-failed"] as const)(
    "preserves valid v3 bytes when migration reports %s",
    (reason) => {
      const storage = new MemoryStorage();
      const raw = rawFixture("recent-scenario-v3.json");
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
    const raw = rawFixture("recent-scenario-v3.json");
    storage.setItem(RECENT_SCENARIO_STORAGE_KEY, raw);

    expect(
      loadRecentScenario(storage, {
        migrateHistoricalScenario: () => ({
          ok: true,
          scenario: { schemaVersion: 4 } as never,
        }),
      }),
    ).toEqual({ status: "migration-required", reason: "target-validation-failed" });
    expect(storage.getItem(RECENT_SCENARIO_STORAGE_KEY)).toBe(raw);
  });

  it("restores a validated migration in memory while preserving bytes when rewrite fails", () => {
    const raw = rawFixture("recent-scenario-v3.json");
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
      expect(loaded.scenario.analysisSnapshot.compatibility).toBe("legacy-api-only");
    }
    expect(storage.getItem()).toBe(raw);
  });

  it.each(goldenFiles)("removes a malformed declared historical $filename record", ({ fixture }) => {
    const storage = new MemoryStorage();
    const damaged = structuredClone(fixture) as typeof fixture & {
      response: { analysis: { tasks: Array<{ taskId: string }> } };
    };
    damaged.response.analysis.tasks[0].taskId = "wrong-id";
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
