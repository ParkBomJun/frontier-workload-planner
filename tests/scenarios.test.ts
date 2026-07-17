import { describe, expect, it } from "vitest";

import { createMockAnalysis } from "@/lib/ai/mock-response";
import {
  clearRecentScenario,
  loadRecentScenario,
  RECENT_SCENARIO_STORAGE_KEY,
  saveRecentScenario,
} from "@/lib/storage/scenarios";
import type { AnalyzeSuccessResponse, PlanningSettings, TaskInput } from "@/types/domain";

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
  { id: "task-1", name: "API 설계", description: "입력 검증이 있는 API를 설계한다." },
  { id: "task-2", name: "안내문", description: "짧은 안내문을 작성한다." },
];
const settings: PlanningSettings = {
  budgetUsd: 5,
  deadlineDays: 7,
  strategy: "balanced",
};
const response: AnalyzeSuccessResponse = {
  ok: true,
  mode: "mock",
  model: "mock-fixture-v1",
  generatedAt: "2026-07-17T01:00:00.000Z",
  analysis: createMockAnalysis(tasks),
};
const savedAt = "2026-07-17T01:01:00.000Z";

describe("recent scenario storage", () => {
  it("round-trips one validated versioned scenario", () => {
    const storage = new MemoryStorage();
    const saved = saveRecentScenario({ tasks, settings, response }, storage, savedAt);
    const loaded = loadRecentScenario(storage);

    expect(saved).toMatchObject({ ok: true });
    expect(loaded).toMatchObject({
      status: "loaded",
      scenario: {
        schemaVersion: 1,
        savedAt,
        tasks,
        settings,
        response,
      },
    });
  });

  it("overwrites the previous scenario at the single fixed key", () => {
    const storage = new MemoryStorage();
    saveRecentScenario({ tasks, settings, response }, storage, savedAt);
    const renamedTasks = tasks.map((task, index) =>
      index === 0 ? { ...task, name: "수정된 API 설계" } : task,
    );
    const renamedResponse = { ...response, analysis: createMockAnalysis(renamedTasks) };
    saveRecentScenario(
      { tasks: renamedTasks, settings, response: renamedResponse },
      storage,
      "2026-07-17T01:02:00.000Z",
    );

    const loaded = loadRecentScenario(storage);
    expect(loaded.status).toBe("loaded");
    if (loaded.status === "loaded") {
      expect(loaded.scenario.tasks[0].name).toBe("수정된 API 설계");
    }
  });

  it("returns empty when no recent scenario exists", () => {
    expect(loadRecentScenario(new MemoryStorage())).toEqual({ status: "empty" });
  });

  it("discards malformed JSON and an identity-mismatched current version", () => {
    const malformedStorage = new MemoryStorage();
    malformedStorage.setItem(RECENT_SCENARIO_STORAGE_KEY, "{not-json");
    expect(loadRecentScenario(malformedStorage)).toEqual({ status: "discarded" });
    expect(malformedStorage.getItem(RECENT_SCENARIO_STORAGE_KEY)).toBeNull();

    const mismatchedStorage = new MemoryStorage();
    const saved = saveRecentScenario({ tasks, settings, response }, mismatchedStorage, savedAt);
    expect(saved.ok).toBe(true);
    const raw = JSON.parse(mismatchedStorage.getItem(RECENT_SCENARIO_STORAGE_KEY) ?? "{}") as {
      response: AnalyzeSuccessResponse;
    };
    raw.response.analysis.tasks[0].taskId = "wrong-id";
    mismatchedStorage.setItem(RECENT_SCENARIO_STORAGE_KEY, JSON.stringify(raw));

    expect(loadRecentScenario(mismatchedStorage)).toEqual({ status: "discarded" });
    expect(mismatchedStorage.getItem(RECENT_SCENARIO_STORAGE_KEY)).toBeNull();
  });

  it("preserves an unknown future version", () => {
    const storage = new MemoryStorage();
    const future = JSON.stringify({ schemaVersion: 2, future: true });
    storage.setItem(RECENT_SCENARIO_STORAGE_KEY, future);

    expect(loadRecentScenario(storage)).toEqual({ status: "unsupported" });
    expect(storage.getItem(RECENT_SCENARIO_STORAGE_KEY)).toBe(future);
  });

  it("rejects invalid input before writing", () => {
    const storage = new MemoryStorage();
    const duplicateTasks = [{ ...tasks[0] }, { ...tasks[1], id: tasks[0].id }];
    const saved = saveRecentScenario(
      { tasks: duplicateTasks, settings, response },
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
    expect(saveRecentScenario({ tasks, settings, response }, setFailure, savedAt)).toEqual({
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
    saveRecentScenario({ tasks, settings, response }, storage, savedAt);
    expect(clearRecentScenario(storage)).toBe(true);
    expect(loadRecentScenario(storage)).toEqual({ status: "empty" });
  });
});
