import { z } from "zod";

import {
  analysisDocumentSchema,
  MAX_TASKS,
  taskInputSchema,
} from "@/lib/ai/schema";
import {
  frozenAnalyzeSuccessResponseV1Schema,
  historicalRecentScenarioV1Schema,
  historicalRecentScenarioV2Schema,
  historicalRecentScenarioV3Schema,
  historicalRecentScenarioV4Schema,
  historicalRecentScenarioV5Schema,
  historicalRecentScenarioV6Schema,
  type HistoricalRecentScenarioV1,
  type HistoricalRecentScenarioV2,
  type HistoricalRecentScenarioV3,
  type HistoricalRecentScenarioV4,
  type HistoricalRecentScenarioV5,
  type HistoricalRecentScenarioV6,
} from "@/lib/storage/historical-schemas";
import {
  bestFitSourceStateSchema,
  createBestFitSourceState,
  createEmptyBestFitSourceState,
  type BestFitSourceState,
} from "@/lib/storage/best-fit-sources";
import {
  PLANNING_STRATEGIES,
  PROVIDER_IDS,
  type StoredAnalysisSnapshot,
} from "@/types/domain";

export const RECENT_SCENARIO_STORAGE_KEY = "frontier-workload-planner:recent-scenario";
export const RECENT_SCENARIO_VERSION = 7;

interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const budgetUsdSchema = z.number().finite().min(0.01).max(10_000);

export const incrementalCashBudgetSchema = z.discriminatedUnion("status", [
  z.strictObject({
    status: z.literal("legacy-api-only-unconfirmed"),
    legacyBudgetUsd: budgetUsdSchema,
  }),
  z.strictObject({
    status: z.literal("confirmed"),
    incrementalCashBudgetUsd: budgetUsdSchema,
    confirmedAt: z.iso.datetime(),
  }),
]);

const planningSettingsSchema = z
  .strictObject({
    budgetUsd: budgetUsdSchema,
    deadlineDays: z.number().int().min(1).max(90),
    strategy: z.enum(PLANNING_STRATEGIES),
    incrementalCashBudget: incrementalCashBudgetSchema,
  })
  .superRefine(({ budgetUsd, incrementalCashBudget }, context) => {
    if (
      incrementalCashBudget.status === "legacy-api-only-unconfirmed" &&
      incrementalCashBudget.legacyBudgetUsd !== budgetUsd
    ) {
      context.addIssue({
        code: "custom",
        path: ["incrementalCashBudget", "legacyBudgetUsd"],
        message: "An unconfirmed incremental-cash draft must preserve the legacy API-only budget.",
      });
    }
  });

const analyzeSuccessResponseV2Schema = z.strictObject({
  ok: z.literal(true),
  mode: z.enum(["mock", "live"]),
  model: z.string().min(1).max(200),
  generatedAt: z.iso.datetime(),
  analysis: analysisDocumentSchema,
});

export const storedAnalysisSnapshotSchema = z.discriminatedUnion("contractVersion", [
  z.strictObject({
    contractVersion: z.literal("api-analysis-v1"),
    compatibility: z.literal("legacy-api-only"),
    response: frozenAnalyzeSuccessResponseV1Schema,
  }),
  z.strictObject({
    contractVersion: z.literal("best-fit-analysis-v2"),
    compatibility: z.literal("best-fit"),
    response: analyzeSuccessResponseV2Schema,
  }),
]);

export const recentScenarioSchema = z
  .strictObject({
    schemaVersion: z.literal(RECENT_SCENARIO_VERSION),
    savedAt: z.iso.datetime(),
    selectedProvider: z.enum(PROVIDER_IDS),
    tasks: z.array(taskInputSchema).min(1).max(MAX_TASKS),
    settings: planningSettingsSchema,
    analysisSnapshot: storedAnalysisSnapshotSchema,
    bestFitSources: bestFitSourceStateSchema,
  })
  .superRefine(({ tasks, analysisSnapshot }, context) => {
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

    const analyses = analysisSnapshot.response.analysis.tasks;
    const identitiesMatch =
      analyses.length === tasks.length &&
      analyses.every((analysis, index) => analysis.taskId === tasks[index].id);
    if (!identitiesMatch) {
      context.addIssue({
        code: "custom",
        path: ["analysisSnapshot", "response", "analysis", "tasks"],
        message: "Stored analyses must preserve task order and identity.",
      });
    }
  });

export type RecentScenario = z.infer<typeof recentScenarioSchema>;
export type IncrementalCashBudget = z.infer<typeof incrementalCashBudgetSchema>;

export type RecentScenarioSettingsInput = Omit<
  RecentScenario["settings"],
  "incrementalCashBudget"
> & {
  incrementalCashBudget?: IncrementalCashBudget;
};

export interface RecentScenarioInput {
  selectedProvider: RecentScenario["selectedProvider"];
  tasks: RecentScenario["tasks"];
  settings: RecentScenarioSettingsInput;
  analysisSnapshot: StoredAnalysisSnapshot;
  bestFitSources?: BestFitSourceState;
}

export type ConfirmIncrementalCashBudgetResult =
  | { ok: true; settings: RecentScenario["settings"] }
  | { ok: false; reason: "invalid" };

export type LoadRecentScenarioResult =
  | { status: "loaded"; scenario: RecentScenario }
  | { status: "empty" }
  | { status: "discarded" }
  | { status: "unsupported" }
  | { status: "migration-required"; reason: "adaptation-failed" | "target-validation-failed" }
  | { status: "unavailable" };

export type SaveRecentScenarioResult =
  | { ok: true; scenario: RecentScenario }
  | { ok: false; reason: "invalid" | "unavailable" | "write-failed" };

type HistoricalScenario =
  | HistoricalRecentScenarioV1
  | HistoricalRecentScenarioV2
  | HistoricalRecentScenarioV3
  | HistoricalRecentScenarioV4
  | HistoricalRecentScenarioV5
  | HistoricalRecentScenarioV6;

type HistoricalMigrationResult =
  | { ok: true; scenario: RecentScenario }
  | { ok: false; reason: "adaptation-failed" | "target-validation-failed" };

interface ScenarioLoadDependencies {
  migrateHistoricalScenario?: (scenario: HistoricalScenario) => HistoricalMigrationResult;
}

function resolveStorage(storage?: KeyValueStorage): KeyValueStorage | null {
  if (storage) return storage;
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function discardStoredScenario(storage: KeyValueStorage): LoadRecentScenarioResult {
  try {
    storage.removeItem(RECENT_SCENARIO_STORAGE_KEY);
  } catch {
    // The malformed value is ignored even if storage cleanup is blocked.
  }
  return { status: "discarded" };
}

function unconfirmedIncrementalCashBudget(
  legacyBudgetUsd: number,
): IncrementalCashBudget {
  return {
    status: "legacy-api-only-unconfirmed",
    legacyBudgetUsd,
  };
}

function normalizePlanningSettingsInput(
  settings: RecentScenarioSettingsInput,
): unknown {
  return {
    ...settings,
    incrementalCashBudget:
      settings.incrementalCashBudget ??
      unconfirmedIncrementalCashBudget(settings.budgetUsd),
  };
}

/**
 * Applies the user's explicit total-incremental-cash confirmation without
 * reading or writing storage. Callers still choose when to persist the result.
 */
export function confirmIncrementalCashBudget(
  settings: RecentScenarioSettingsInput,
  incrementalCashBudgetUsd: number,
  confirmedAt: string,
): ConfirmIncrementalCashBudgetResult {
  const parsed = planningSettingsSchema.safeParse({
    ...settings,
    incrementalCashBudget: {
      status: "confirmed",
      incrementalCashBudgetUsd,
      confirmedAt,
    },
  });
  return parsed.success
    ? { ok: true, settings: parsed.data }
    : { ok: false, reason: "invalid" };
}

/**
 * Keeps an explicit budget confirmation only while the edited amount still
 * matches it. A new amount must be confirmed before allocation resumes.
 */
export function reconcileIncrementalCashBudget(
  budgetUsd: number,
  current: IncrementalCashBudget | null,
): IncrementalCashBudget | null {
  if (!budgetUsdSchema.safeParse(budgetUsd).success) return null;
  if (
    current?.status === "confirmed" &&
    current.incrementalCashBudgetUsd === budgetUsd
  ) {
    return current;
  }
  return unconfirmedIncrementalCashBudget(budgetUsd);
}

function adaptV1ToV2(
  scenario: HistoricalRecentScenarioV1,
): HistoricalRecentScenarioV2 | null {
  const parsed = historicalRecentScenarioV2Schema.safeParse({
    schemaVersion: 2,
    savedAt: scenario.savedAt,
    tasks: scenario.tasks.map((task) => ({ ...task, priority: "medium" as const })),
    settings: scenario.settings,
    response: scenario.response,
  });
  return parsed.success ? parsed.data : null;
}

function adaptV2ToV3(
  scenario: HistoricalRecentScenarioV2,
): HistoricalRecentScenarioV3 | null {
  const parsed = historicalRecentScenarioV3Schema.safeParse({
    schemaVersion: 3,
    savedAt: scenario.savedAt,
    selectedProvider: "openai",
    tasks: scenario.tasks,
    settings: scenario.settings,
    response: scenario.response,
  });
  return parsed.success ? parsed.data : null;
}

function adaptV3ToV4(
  scenario: HistoricalRecentScenarioV3,
): HistoricalRecentScenarioV4 | null {
  const parsed = historicalRecentScenarioV4Schema.safeParse({
    schemaVersion: 4,
    savedAt: scenario.savedAt,
    selectedProvider: scenario.selectedProvider,
    tasks: scenario.tasks.map((task) => ({
      ...task,
      deadlineDate: null,
      failureImpact: "unspecified" as const,
    })),
    settings: scenario.settings,
    analysisSnapshot: {
      contractVersion: "api-analysis-v1" as const,
      compatibility: "legacy-api-only" as const,
      response: scenario.response,
    },
  });
  return parsed.success ? parsed.data : null;
}

function adaptV4ToV5(
  scenario: HistoricalRecentScenarioV4,
): HistoricalRecentScenarioV5 | null {
  const parsed = historicalRecentScenarioV5Schema.safeParse({
    schemaVersion: 5,
    savedAt: scenario.savedAt,
    selectedProvider: scenario.selectedProvider,
    tasks: scenario.tasks,
    settings: {
      ...scenario.settings,
      incrementalCashBudget: unconfirmedIncrementalCashBudget(
        scenario.settings.budgetUsd,
      ),
    },
    analysisSnapshot: scenario.analysisSnapshot,
  });
  return parsed.success ? parsed.data : null;
}

function adaptV5ToV7Candidate(
  scenario: HistoricalRecentScenarioV5,
): unknown {
  return {
    schemaVersion: RECENT_SCENARIO_VERSION,
    savedAt: scenario.savedAt,
    selectedProvider: scenario.selectedProvider,
    tasks: scenario.tasks,
    settings: scenario.settings,
    analysisSnapshot: scenario.analysisSnapshot,
    bestFitSources: createEmptyBestFitSourceState(),
  };
}

function adaptV6ToV7Candidate(
  scenario: HistoricalRecentScenarioV6,
): unknown | null {
  const bestFitSources = createBestFitSourceState({
    resourceDrafts: scenario.bestFitSources.availableAiResources.drafts.map(
      (draft) => ({ ...draft, provisionedBy: "unspecified" as const }),
    ),
    resourceEvidenceObservedAtById:
      scenario.bestFitSources.availableAiResources.evidenceObservedAtById,
    apiOverrides: scenario.bestFitSources.apiCatalogOverrides.overrides,
  });
  if (bestFitSources === null) return null;

  return {
    schemaVersion: RECENT_SCENARIO_VERSION,
    savedAt: scenario.savedAt,
    selectedProvider: scenario.selectedProvider,
    tasks: scenario.tasks,
    settings: scenario.settings,
    analysisSnapshot: scenario.analysisSnapshot,
    bestFitSources,
  };
}

export function migrateHistoricalScenarioToCurrent(
  source: HistoricalScenario,
): HistoricalMigrationResult {
  if (source.schemaVersion === 6) {
    const candidate = adaptV6ToV7Candidate(source);
    if (candidate === null) {
      return { ok: false, reason: "adaptation-failed" };
    }
    const parsed = recentScenarioSchema.safeParse(candidate);
    return parsed.success
      ? { ok: true, scenario: parsed.data }
      : { ok: false, reason: "target-validation-failed" };
  }

  let v5: HistoricalRecentScenarioV5 | null;

  if (source.schemaVersion === 1) {
    const v2 = adaptV1ToV2(source);
    if (!v2) return { ok: false, reason: "adaptation-failed" };
    const v3 = adaptV2ToV3(v2);
    const v4 = v3 === null ? null : adaptV3ToV4(v3);
    v5 = v4 === null ? null : adaptV4ToV5(v4);
  } else if (source.schemaVersion === 2) {
    const v3 = adaptV2ToV3(source);
    const v4 = v3 === null ? null : adaptV3ToV4(v3);
    v5 = v4 === null ? null : adaptV4ToV5(v4);
  } else if (source.schemaVersion === 3) {
    const v4 = adaptV3ToV4(source);
    v5 = v4 === null ? null : adaptV4ToV5(v4);
  } else if (source.schemaVersion === 4) {
    v5 = adaptV4ToV5(source);
  } else {
    v5 = source;
  }

  if (!v5) return { ok: false, reason: "adaptation-failed" };
  const parsed = recentScenarioSchema.safeParse(adaptV5ToV7Candidate(v5));
  return parsed.success
    ? { ok: true, scenario: parsed.data }
    : { ok: false, reason: "target-validation-failed" };
}

function parseHistoricalScenario(
  version: 1 | 2 | 3 | 4 | 5 | 6,
  value: unknown,
): HistoricalScenario | null {
  const parsed = version === 1
    ? historicalRecentScenarioV1Schema.safeParse(value)
    : version === 2
      ? historicalRecentScenarioV2Schema.safeParse(value)
      : version === 3
        ? historicalRecentScenarioV3Schema.safeParse(value)
        : version === 4
          ? historicalRecentScenarioV4Schema.safeParse(value)
          : version === 5
            ? historicalRecentScenarioV5Schema.safeParse(value)
            : historicalRecentScenarioV6Schema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function loadRecentScenario(
  storage?: KeyValueStorage,
  dependencies: ScenarioLoadDependencies = {},
): LoadRecentScenarioResult {
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
    return discardStoredScenario(resolvedStorage);
  }

  const declaredVersion =
    typeof parsedJson === "object" && parsedJson !== null && "schemaVersion" in parsedJson
      ? parsedJson.schemaVersion
      : undefined;

  if (
    typeof declaredVersion === "number" &&
    Number.isInteger(declaredVersion) &&
    declaredVersion > RECENT_SCENARIO_VERSION
  ) {
    return { status: "unsupported" };
  }

  if (declaredVersion === RECENT_SCENARIO_VERSION) {
    const parsedScenario = recentScenarioSchema.safeParse(parsedJson);
    return parsedScenario.success
      ? { status: "loaded", scenario: parsedScenario.data }
      : discardStoredScenario(resolvedStorage);
  }

  if (
    declaredVersion === 1 ||
    declaredVersion === 2 ||
    declaredVersion === 3 ||
    declaredVersion === 4 ||
    declaredVersion === 5 ||
    declaredVersion === 6
  ) {
    const historicalScenario = parseHistoricalScenario(declaredVersion, parsedJson);
    if (!historicalScenario) return discardStoredScenario(resolvedStorage);

    const migrate = dependencies.migrateHistoricalScenario ?? migrateHistoricalScenarioToCurrent;
    const migrated = migrate(historicalScenario);
    if (!migrated.ok) {
      return { status: "migration-required", reason: migrated.reason };
    }

    // The loader owns the persistence boundary. Revalidate even injected adapter
    // results so no successful-looking dependency can overwrite valid legacy bytes
    // with an invalid current record.
    const validatedMigration = recentScenarioSchema.safeParse(migrated.scenario);
    if (!validatedMigration.success) {
      return { status: "migration-required", reason: "target-validation-failed" };
    }

    try {
      resolvedStorage.setItem(
        RECENT_SCENARIO_STORAGE_KEY,
        JSON.stringify(validatedMigration.data),
      );
    } catch {
      // A fully validated migration can still be restored in memory. The original bytes remain.
    }
    return { status: "loaded", scenario: validatedMigration.data };
  }

  return discardStoredScenario(resolvedStorage);
}

export function saveRecentScenario(
  input: RecentScenarioInput,
  storage?: KeyValueStorage,
  savedAt = new Date().toISOString(),
): SaveRecentScenarioResult {
  const parsedScenario = recentScenarioSchema.safeParse({
    schemaVersion: RECENT_SCENARIO_VERSION,
    savedAt,
    selectedProvider: input.selectedProvider,
    tasks: input.tasks,
    settings: normalizePlanningSettingsInput(input.settings),
    analysisSnapshot: input.analysisSnapshot,
    bestFitSources: input.bestFitSources ?? createEmptyBestFitSourceState(),
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
