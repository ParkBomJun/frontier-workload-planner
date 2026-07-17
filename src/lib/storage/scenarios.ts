import { z } from "zod";

import {
  analysisDocumentSchema,
  MAX_TASKS,
  taskInputSchema,
} from "@/lib/ai/schema";
import { PLANNING_STRATEGIES, type AnalyzeSuccessResponse } from "@/types/domain";

export const RECENT_SCENARIO_STORAGE_KEY = "frontier-workload-planner:recent-scenario";
export const RECENT_SCENARIO_VERSION = 1;

interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const planningSettingsSchema = z.strictObject({
  budgetUsd: z.number().finite().min(0.01).max(10_000),
  deadlineDays: z.number().int().min(1).max(90),
  strategy: z.enum(PLANNING_STRATEGIES),
});

const successResponseSchema = z.strictObject({
  ok: z.literal(true),
  mode: z.enum(["mock", "live"]),
  model: z.string().min(1).max(200),
  generatedAt: z.iso.datetime(),
  analysis: analysisDocumentSchema,
});

export const recentScenarioSchema = z
  .strictObject({
    schemaVersion: z.literal(RECENT_SCENARIO_VERSION),
    savedAt: z.iso.datetime(),
    tasks: z.array(taskInputSchema).min(1).max(MAX_TASKS),
    settings: planningSettingsSchema,
    response: successResponseSchema,
  })
  .superRefine(({ tasks, response }, context) => {
    const taskIds = new Set<string>();
    tasks.forEach((task, index) => {
      if (taskIds.has(task.id)) {
        context.addIssue({
          code: "custom",
          path: ["tasks", index, "id"],
          message: "Stored task IDs must be unique.",
        });
      }
      taskIds.add(task.id);
    });

    const identitiesMatch =
      response.analysis.tasks.length === tasks.length &&
      response.analysis.tasks.every((analysis, index) => analysis.taskId === tasks[index].id);
    if (!identitiesMatch) {
      context.addIssue({
        code: "custom",
        path: ["response", "analysis", "tasks"],
        message: "Stored analyses must preserve task order and identity.",
      });
    }
  });

export type RecentScenario = z.infer<typeof recentScenarioSchema>;

export interface RecentScenarioInput {
  tasks: RecentScenario["tasks"];
  settings: RecentScenario["settings"];
  response: AnalyzeSuccessResponse;
}

export type LoadRecentScenarioResult =
  | { status: "loaded"; scenario: RecentScenario }
  | { status: "empty" }
  | { status: "discarded" }
  | { status: "unsupported" }
  | { status: "unavailable" };

export type SaveRecentScenarioResult =
  | { ok: true; scenario: RecentScenario }
  | { ok: false; reason: "invalid" | "unavailable" | "write-failed" };

function resolveStorage(storage?: KeyValueStorage): KeyValueStorage | null {
  if (storage) return storage;
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadRecentScenario(storage?: KeyValueStorage): LoadRecentScenarioResult {
  const resolvedStorage = resolveStorage(storage);
  if (!resolvedStorage) return { status: "unavailable" };

  let rawValue: string | null;
  try {
    rawValue = resolvedStorage.getItem(RECENT_SCENARIO_STORAGE_KEY);
  } catch {
    return { status: "unavailable" };
  }
  if (!rawValue) return { status: "empty" };

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawValue);
  } catch {
    try {
      resolvedStorage.removeItem(RECENT_SCENARIO_STORAGE_KEY);
    } catch {
      // A blocked cleanup must not prevent the app from starting.
    }
    return { status: "discarded" };
  }

  if (
    typeof parsedJson === "object" &&
    parsedJson !== null &&
    "schemaVersion" in parsedJson &&
    typeof parsedJson.schemaVersion === "number" &&
    parsedJson.schemaVersion !== RECENT_SCENARIO_VERSION
  ) {
    return { status: "unsupported" };
  }

  const parsedScenario = recentScenarioSchema.safeParse(parsedJson);
  if (parsedScenario.success) return { status: "loaded", scenario: parsedScenario.data };

  try {
    resolvedStorage.removeItem(RECENT_SCENARIO_STORAGE_KEY);
  } catch {
    // The invalid value is ignored even if storage cleanup is blocked.
  }
  return { status: "discarded" };
}

export function saveRecentScenario(
  input: RecentScenarioInput,
  storage?: KeyValueStorage,
  savedAt = new Date().toISOString(),
): SaveRecentScenarioResult {
  const parsedScenario = recentScenarioSchema.safeParse({
    schemaVersion: RECENT_SCENARIO_VERSION,
    savedAt,
    ...input,
  });
  if (!parsedScenario.success) return { ok: false, reason: "invalid" };

  const resolvedStorage = resolveStorage(storage);
  if (!resolvedStorage) return { ok: false, reason: "unavailable" };

  try {
    resolvedStorage.setItem(RECENT_SCENARIO_STORAGE_KEY, JSON.stringify(parsedScenario.data));
    return { ok: true, scenario: parsedScenario.data };
  } catch {
    return { ok: false, reason: "write-failed" };
  }
}

export function clearRecentScenario(storage?: KeyValueStorage): boolean {
  const resolvedStorage = resolveStorage(storage);
  if (!resolvedStorage) return false;

  try {
    resolvedStorage.removeItem(RECENT_SCENARIO_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
