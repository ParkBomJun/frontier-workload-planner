"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";

import { AnalysisResults } from "@/components/analysis-results";
import { AvailableAiResources } from "@/components/available-ai-resources";
import { BestFitResults } from "@/components/best-fit-results";
import { BudgetSettings, type PlanningFormState } from "@/components/budget-settings";
import { CatalogOverrideEditor } from "@/components/catalog-override-editor";
import { useLanguage } from "@/components/language-provider";
import { TaskEditor } from "@/components/task-editor";
import { PROVIDER_CATALOG } from "@/config/provider-catalog";
import type { SubscriptionPresetId } from "@/config/subscription-presets";
import { SAMPLE_TASKS_BY_LOCALE } from "@/data/examples";
import { MAX_TASKS } from "@/lib/ai/schema";
import { compareProviderPlans } from "@/lib/calculation/compare-providers";
import { BEST_FIT_UI_COPY } from "@/lib/i18n/best-fit-ui-copy";
import type { UiCopy } from "@/lib/i18n/ui-copy";
import {
  buildBestFitUiPlan,
  reconcileBestFitRelevantSettings,
  type BestFitRelevantSettings,
  type BestFitUiPlan,
} from "@/lib/planning/best-fit-ui-plan";
import {
  advancePlanningRevisionAt,
  resolveBestFitPlanningAsOf,
  resolveRestoredPlanningRevisionAt,
} from "@/lib/planning/planning-clock";
import {
  createAvailableAiResourceEvidenceObservedAt,
  createDefaultAvailableAiResourceDraft,
  updateAvailableAiResourceEvidenceObservedAt,
} from "@/lib/planning/resource-drafts";
import {
  clearRecentScenario,
  confirmIncrementalCashBudget,
  loadRecentScenario,
  saveRecentScenario,
  type IncrementalCashBudget,
} from "@/lib/storage/scenarios";
import type {
  AnalysisMode,
  AnalyzeApiResponse,
  PlanningSettings,
  PlanningStrategy,
  ProviderId,
  StoredAnalysisSnapshot,
  TaskInput,
  TaskPriority,
} from "@/types/domain";
import type { ApiCatalogOverride } from "@/types/pricing";
import type {
  AvailableAiResourceDraft,
  AvailableAiResourceEvidenceObservedAt,
} from "@/types/resource-drafts";
import type { FailureImpact } from "@/types/workload";

const INITIAL_TASKS: TaskInput[] = [
  {
    id: "task-1",
    name: "",
    description: "",
    priority: "medium",
    deadlineDate: null,
    failureImpact: "medium",
  },
];

const INITIAL_SETTINGS: PlanningFormState = {
  budgetUsd: "5.00",
  deadlineDays: "7",
  strategy: "balanced",
};

const INITIAL_INCREMENTAL_CASH_BUDGET: IncrementalCashBudget = {
  status: "legacy-api-only-unconfirmed",
  legacyBudgetUsd: 5,
};

type RequestStatus = "idle" | "loading" | "success" | "error";

type VisibleErrorKind =
  | "invalid-form"
  | "request-failed"
  | "api"
  | "request-timeout"
  | "network-error";

interface VisibleError {
  kind: VisibleErrorKind;
  code?: string;
}

interface CompletedAnalysis {
  analysisSnapshot: StoredAnalysisSnapshot;
  tasks: TaskInput[];
}

interface StorageNotice {
  tone: "success" | "warning";
  kind:
    | "restored"
    | "legacy-restored"
    | "migration-required"
    | "corrupt"
    | "future-version"
    | "unavailable"
    | "empty"
    | "saved"
    | "invalid"
    | "write-failed"
    | "deleted"
    | "delete-failed";
  canClear: boolean;
  savedAt?: string;
}

type AllocationNotice =
  | { kind: "priority"; task: string; priority: TaskPriority }
  | { kind: "settings"; budgetUsd: number; strategy: PlanningStrategy }
  | { kind: "provider"; providerId: ProviderId };

type ApiErrorCopyKey =
  | "requestTooLarge"
  | "invalidJson"
  | "invalidInput"
  | "liveDisabled"
  | "apiKeyMissing"
  | "modelRefusal"
  | "liveAnalysisFailed";

const API_ERROR_COPY_KEYS = {
  REQUEST_TOO_LARGE: "requestTooLarge",
  INVALID_JSON: "invalidJson",
  INVALID_INPUT: "invalidInput",
  LIVE_ANALYSIS_DISABLED: "liveDisabled",
  OPENAI_API_KEY_MISSING: "apiKeyMissing",
  MODEL_REFUSAL: "modelRefusal",
  LIVE_ANALYSIS_FAILED: "liveAnalysisFailed",
} as const satisfies Record<string, ApiErrorCopyKey>;

function visibleErrorMessage(error: VisibleError, copy: UiCopy): string {
  if (error.kind === "invalid-form") return copy.page.invalidForm;
  if (error.kind === "request-failed") return copy.page.requestFailed;
  if (error.kind === "request-timeout") return copy.page.requestTimeout;
  if (error.kind === "network-error") return copy.page.networkError;

  const knownCopyKey = error.code
    ? API_ERROR_COPY_KEYS[error.code as keyof typeof API_ERROR_COPY_KEYS]
    : undefined;
  return knownCopyKey ? copy.page[knownCopyKey] : copy.page.unknownApiError;
}

function storageNoticeMessage(
  notice: StorageNotice,
  copy: UiCopy,
  dateLocale: string,
): string {
  switch (notice.kind) {
    case "restored":
      return copy.page.storageRestored(
        new Date(notice.savedAt ?? 0).toLocaleString(dateLocale),
      );
    case "legacy-restored":
      return copy.page.storageLegacyRestored(
        new Date(notice.savedAt ?? 0).toLocaleString(dateLocale),
      );
    case "migration-required":
      return copy.page.storageMigrationRequired;
    case "corrupt":
      return copy.page.storageCorrupt;
    case "future-version":
      return copy.page.storageFutureVersion;
    case "unavailable":
      return copy.page.storageUnavailable;
    case "empty":
      return copy.page.storageEmpty;
    case "saved":
      return copy.page.storageSaved;
    case "invalid":
      return copy.page.storageInvalid;
    case "write-failed":
      return copy.page.storageWriteFailed;
    case "deleted":
      return copy.page.storageDeleted;
    case "delete-failed":
      return copy.page.storageDeleteFailed;
  }
}

function allocationNoticeMessage(notice: AllocationNotice | null, copy: UiCopy): string {
  if (!notice) return "";
  if (notice.kind === "priority") {
    return copy.page.allocationPriorityNotice(
      notice.task,
      copy.enums.priority[notice.priority],
    );
  }
  if (notice.kind === "settings") {
    return copy.page.allocationSettingsNotice(
      notice.budgetUsd,
      copy.enums.strategy[notice.strategy],
    );
  }
  return copy.page.allocationProviderNotice(copy.enums.provider[notice.providerId]);
}

function parsePlanningSettings(value: PlanningFormState): PlanningSettings | null {
  const budgetUsd = Number(value.budgetUsd);
  const deadlineDays = Number(value.deadlineDays);
  if (!Number.isFinite(budgetUsd) || budgetUsd < 0.01 || budgetUsd > 10_000) return null;
  if (!Number.isInteger(deadlineDays) || deadlineDays < 1 || deadlineDays > 90) return null;
  return { budgetUsd, deadlineDays, strategy: value.strategy };
}

function reconcileIncrementalCashBudget(
  budgetUsd: number,
  current: IncrementalCashBudget | null,
): IncrementalCashBudget | null {
  if (!Number.isFinite(budgetUsd) || budgetUsd < 0.01 || budgetUsd > 10_000) {
    return null;
  }
  if (
    current?.status === "confirmed" &&
    current.incrementalCashBudgetUsd === budgetUsd
  ) {
    return current;
  }
  return {
    status: "legacy-api-only-unconfirmed",
    legacyBudgetUsd: budgetUsd,
  };
}

function nextAvailableTaskNumber(tasks: TaskInput[], startAt = 1): number {
  const taskIds = new Set(tasks.map((task) => task.id));
  let candidate = Math.max(1, startAt);
  while (taskIds.has(`task-${candidate}`)) candidate += 1;
  return candidate;
}

function planningFormState(settings: PlanningSettings): PlanningFormState {
  return {
    budgetUsd: String(settings.budgetUsd),
    deadlineDays: String(settings.deadlineDays),
    strategy: settings.strategy,
  };
}

export default function Home() {
  const { locale, copy, localeMeta } = useLanguage();
  const bestFitCopy = BEST_FIT_UI_COPY[locale];
  const [tasks, setTasks] = useState<TaskInput[]>(INITIAL_TASKS);
  const [settings, setSettings] = useState<PlanningFormState>(INITIAL_SETTINGS);
  const [incrementalCashBudget, setIncrementalCashBudget] =
    useState<IncrementalCashBudget | null>(INITIAL_INCREMENTAL_CASH_BUDGET);
  const [resourceDrafts, setResourceDrafts] = useState<AvailableAiResourceDraft[]>([]);
  const [resourceEvidenceObservedAtById, setResourceEvidenceObservedAtById] = useState<
    Record<string, AvailableAiResourceEvidenceObservedAt>
  >({});
  const [apiOverrides, setApiOverrides] = useState<readonly ApiCatalogOverride[]>([]);
  const [planningRevisionAt, advancePlanningRevision] = useReducer(
    advancePlanningRevisionAt,
    null,
  );
  const [mode, setMode] = useState<AnalysisMode>("mock");
  const [selectedProvider, setSelectedProvider] = useState<ProviderId>("openai");
  const [status, setStatus] = useState<RequestStatus>("idle");
  const [completed, setCompleted] = useState<CompletedAnalysis | null>(null);
  const [visibleError, setVisibleError] = useState<VisibleError | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [storageChecked, setStorageChecked] = useState(false);
  const [hasRecentScenario, setHasRecentScenario] = useState(false);
  const [storageNotice, setStorageNotice] = useState<StorageNotice | null>(null);
  const [allocationNotice, setAllocationNotice] = useState<AllocationNotice | null>(null);
  const nextTaskNumber = useRef(2);
  const nextResourceNumber = useRef(1);
  const lastValidBestFitSettings = useRef<BestFitRelevantSettings>({
    budgetUsd: Number(INITIAL_SETTINGS.budgetUsd),
    strategy: INITIAL_SETTINGS.strategy,
  });

  const restoreRecentScenario = useCallback((announceEmpty = true) => {
    setAllocationNotice(null);
    const result = loadRecentScenario();

    if (result.status === "loaded") {
      const restoredAt = new Date().toISOString();
      const restoredTasks = result.scenario.tasks.map((task) => ({ ...task }));
      const restoredSnapshot = result.scenario.analysisSnapshot;
      lastValidBestFitSettings.current = {
        budgetUsd: result.scenario.settings.budgetUsd,
        strategy: result.scenario.settings.strategy,
      };
      setTasks(restoredTasks);
      setSettings(planningFormState(result.scenario.settings));
      setIncrementalCashBudget(result.scenario.settings.incrementalCashBudget);
      const restoredRevisionAt = resolveRestoredPlanningRevisionAt({
        restoredAt,
        generatedAt: restoredSnapshot.response.generatedAt,
        confirmedAt:
          result.scenario.settings.incrementalCashBudget.status === "confirmed"
            ? result.scenario.settings.incrementalCashBudget.confirmedAt
            : null,
      });
      advancePlanningRevision(restoredRevisionAt);
      setSelectedProvider(result.scenario.selectedProvider);
      setMode(restoredSnapshot.response.mode);
      setCompleted({
        analysisSnapshot: restoredSnapshot,
        tasks: restoredTasks.map((task) => ({ ...task })),
      });
      setStatus("success");
      setVisibleError(null);
      setShowValidation(false);
      setHasRecentScenario(true);
      nextTaskNumber.current = nextAvailableTaskNumber(restoredTasks);
      setStorageNotice({
        tone:
          restoredSnapshot.compatibility === "legacy-api-only" ? "warning" : "success",
        kind:
          restoredSnapshot.compatibility === "legacy-api-only"
            ? "legacy-restored"
            : "restored",
        canClear: true,
        savedAt: result.scenario.savedAt,
      });
    } else if (result.status === "discarded") {
      setHasRecentScenario(false);
      setStorageNotice({
        tone: "warning",
        kind: "corrupt",
        canClear: false,
      });
    } else if (result.status === "unsupported") {
      setHasRecentScenario(false);
      setStorageNotice({
        tone: "warning",
        kind: "future-version",
        canClear: true,
      });
    } else if (result.status === "migration-required") {
      setHasRecentScenario(false);
      setStorageNotice({
        tone: "warning",
        kind: "migration-required",
        canClear: true,
      });
    } else if (result.status === "unavailable") {
      setHasRecentScenario(false);
      setStorageNotice({
        tone: "warning",
        kind: "unavailable",
        canClear: false,
      });
    } else {
      setHasRecentScenario(false);
      if (announceEmpty) {
        setStorageNotice({
          tone: "warning",
          kind: "empty",
          canClear: false,
        });
      }
    }

    setStorageChecked(true);
  }, []);

  useEffect(() => {
    const restoreTimer = window.setTimeout(() => restoreRecentScenario(false), 0);
    return () => window.clearTimeout(restoreTimer);
  }, [restoreRecentScenario]);

  const parsedSettings = useMemo(() => parsePlanningSettings(settings), [settings]);
  const planningAsOf = useMemo(
    () =>
      resolveBestFitPlanningAsOf({
        revisionAt: planningRevisionAt,
        resourceEvidenceObservedAt: Object.values(
          resourceEvidenceObservedAtById,
        ).flatMap((timestamps) =>
          Object.values(timestamps),
        ),
        overrideRecordedAt: apiOverrides.map((override) => override.recordedAt),
        generatedAt: completed?.analysisSnapshot.response.generatedAt ?? null,
        confirmedAt:
          incrementalCashBudget?.status === "confirmed"
            ? incrementalCashBudget.confirmedAt
            : null,
      }),
    [
      apiOverrides,
      completed,
      incrementalCashBudget,
      planningRevisionAt,
      resourceEvidenceObservedAtById,
    ],
  );
  const pricingAsOf =
    planningAsOf?.slice(0, 10) ?? PROVIDER_CATALOG.openai.verifiedAt;
  const providerPlanning = useMemo(() => {
    if (!completed || !parsedSettings) return null;
    return compareProviderPlans(
      completed.tasks,
      completed.analysisSnapshot.response.analysis.tasks,
      parsedSettings,
    );
  }, [completed, parsedSettings]);
  const plan = providerPlanning?.plans[selectedProvider] ?? null;
  const bestFitPlanning = useMemo<
    | { ok: true; result: BestFitUiPlan }
    | { ok: false }
    | null
  >(() => {
    if (
      !completed ||
      completed.analysisSnapshot.compatibility !== "best-fit" ||
      !parsedSettings ||
      incrementalCashBudget?.status !== "confirmed" ||
      planningAsOf === null
    ) {
      return null;
    }
    try {
      return {
        ok: true,
        result: buildBestFitUiPlan({
          tasks: completed.tasks,
          analyses: completed.analysisSnapshot.response.analysis.tasks,
          strategy: parsedSettings.strategy,
          incrementalCashBudgetUsd:
            incrementalCashBudget.incrementalCashBudgetUsd,
          planningAsOf,
          pricingAsOf,
          resourceEvidenceObservedAtById,
          resourceDrafts,
          apiOverrides,
        }),
      };
    } catch {
      return { ok: false };
    }
  }, [
    apiOverrides,
    completed,
    incrementalCashBudget,
    parsedSettings,
    planningAsOf,
    pricingAsOf,
    resourceDrafts,
    resourceEvidenceObservedAtById,
  ]);

  function persistCompletedScenario(
    snapshot: CompletedAnalysis,
    planningSettings: PlanningSettings,
    providerId: ProviderId,
    announceSuccess: boolean,
    nextIncrementalCashBudget: IncrementalCashBudget | null = incrementalCashBudget,
  ) {
    const saved = saveRecentScenario({
      tasks: snapshot.tasks,
      settings: {
        ...planningSettings,
        ...(nextIncrementalCashBudget === null
          ? {}
          : { incrementalCashBudget: nextIncrementalCashBudget }),
      },
      selectedProvider: providerId,
      analysisSnapshot: snapshot.analysisSnapshot,
    });

    if (saved.ok) {
      setHasRecentScenario(true);
      if (announceSuccess) {
        setStorageNotice({
          tone: "success",
          kind: "saved",
          canClear: true,
        });
      }
      return;
    }

    setStorageNotice({
      tone: "warning",
      kind: saved.reason === "invalid" ? "invalid" : "write-failed",
      canClear: hasRecentScenario,
    });
  }

  function invalidateAnalysis() {
    setCompleted(null);
    setVisibleError(null);
    setStatus("idle");
    setAllocationNotice(null);
  }

  function markPlanningRevision(changedAt = new Date().toISOString()) {
    advancePlanningRevision(changedAt);
  }

  function updateTask(taskId: string, field: "name" | "description", value: string) {
    setTasks((current) =>
      current.map((task) => (task.id === taskId ? { ...task, [field]: value } : task)),
    );
    setShowValidation(false);
    invalidateAnalysis();
  }

  function updateTaskPriority(taskId: string, priority: TaskPriority) {
    const updatedTasks = tasks.map((task) =>
      task.id === taskId ? { ...task, priority } : task,
    );
    setTasks(updatedTasks);
    setShowValidation(false);
    setVisibleError(null);

    if (!completed) return;

    const updatedCompleted = {
      ...completed,
      tasks: completed.tasks.map((task) =>
        task.id === taskId ? { ...task, priority } : task,
      ),
    };
    setCompleted(updatedCompleted);
    setStatus("success");
    markPlanningRevision();
    const changedTask = updatedTasks.find((task) => task.id === taskId);
    setAllocationNotice({
      kind: "priority",
      task: changedTask?.name || taskId,
      priority,
    });

    if (hasRecentScenario && parsedSettings) {
      persistCompletedScenario(updatedCompleted, parsedSettings, selectedProvider, false);
    }
  }

  function updateTaskDeadline(taskId: string, deadlineDate: string | null) {
    updateTaskPlanningMetadata(taskId, { deadlineDate });
  }

  function updateTaskFailureImpact(taskId: string, failureImpact: FailureImpact) {
    updateTaskPlanningMetadata(taskId, { failureImpact });
  }

  function updateTaskPlanningMetadata(
    taskId: string,
    patch: Partial<Pick<TaskInput, "deadlineDate" | "failureImpact">>,
  ) {
    const updatedTasks = tasks.map((task) =>
      task.id === taskId ? { ...task, ...patch } : task,
    );
    setTasks(updatedTasks);
    setShowValidation(false);
    setVisibleError(null);
    setAllocationNotice(null);

    if (!completed) return;

    const updatedCompleted = {
      ...completed,
      tasks: completed.tasks.map((task) =>
        task.id === taskId ? { ...task, ...patch } : task,
      ),
    };
    setCompleted(updatedCompleted);
    setStatus("success");
    markPlanningRevision();

    if (hasRecentScenario && parsedSettings) {
      persistCompletedScenario(updatedCompleted, parsedSettings, selectedProvider, false);
    }
  }

  function addTask() {
    if (tasks.length >= MAX_TASKS) return;
    const availableNumber = nextAvailableTaskNumber(tasks, nextTaskNumber.current);
    const taskId = `task-${availableNumber}`;
    nextTaskNumber.current = availableNumber + 1;
    setTasks((current) => [
      ...current,
      {
        id: taskId,
        name: "",
        description: "",
        priority: "medium",
        deadlineDate: null,
        failureImpact: "medium",
      },
    ]);
    setShowValidation(false);
    invalidateAnalysis();
    window.requestAnimationFrame(() => document.getElementById(`task-name-${taskId}`)?.focus());
  }

  function removeTask(taskId: string) {
    if (tasks.length === 1) return;
    const index = tasks.findIndex((task) => task.id === taskId);
    const remaining = tasks.filter((task) => task.id !== taskId);
    const focusTarget = remaining[Math.min(Math.max(index, 0), remaining.length - 1)];
    setTasks(remaining);
    setShowValidation(false);
    invalidateAnalysis();
    window.requestAnimationFrame(() => {
      const target = focusTarget
        ? document.getElementById(`task-name-${focusTarget.id}`)
        : document.getElementById("add-task-button");
      target?.focus();
    });
  }

  function loadSample() {
    setTasks(SAMPLE_TASKS_BY_LOCALE[locale].map((task) => ({ ...task })));
    nextTaskNumber.current = 4;
    setShowValidation(false);
    invalidateAnalysis();
  }

  function updateSettings(value: PlanningFormState) {
    setSettings(value);
    setVisibleError(null);
    setShowValidation(false);
    const nextPlanningSettings = parsePlanningSettings(value);
    const relevantTransition = reconcileBestFitRelevantSettings(
      lastValidBestFitSettings.current,
      nextPlanningSettings,
    );
    lastValidBestFitSettings.current = relevantTransition.lastValid;
    const nextIncrementalCashBudget = reconcileIncrementalCashBudget(
      Number(value.budgetUsd),
      incrementalCashBudget,
    );
    setIncrementalCashBudget(nextIncrementalCashBudget);
    if (completed && nextPlanningSettings) {
      if (relevantTransition.changed) {
        markPlanningRevision();
        setAllocationNotice({
          kind: "settings",
          budgetUsd: nextPlanningSettings.budgetUsd,
          strategy: nextPlanningSettings.strategy,
        });
      } else {
        setAllocationNotice(null);
      }
    } else {
      setAllocationNotice(null);
    }
    if (completed && hasRecentScenario && nextPlanningSettings) {
      persistCompletedScenario(
        completed,
        nextPlanningSettings,
        selectedProvider,
        false,
        nextIncrementalCashBudget,
      );
    }
  }

  function confirmBudgetMeaning() {
    const planningSettings = parsePlanningSettings(settings);
    if (!planningSettings) return;
    const confirmedAt = new Date().toISOString();
    const result = confirmIncrementalCashBudget(
      {
        ...planningSettings,
        ...(incrementalCashBudget === null
          ? {}
          : { incrementalCashBudget }),
      },
      planningSettings.budgetUsd,
      confirmedAt,
    );
    if (!result.ok) return;
    const confirmed = result.settings.incrementalCashBudget;
    setIncrementalCashBudget(confirmed);
    markPlanningRevision(confirmedAt);
    if (completed && hasRecentScenario) {
      persistCompletedScenario(
        completed,
        planningSettings,
        selectedProvider,
        false,
        confirmed,
      );
    }
  }

  function revokeBudgetMeaning() {
    const planningSettings = parsePlanningSettings(settings);
    if (!planningSettings) return;
    const unconfirmed: IncrementalCashBudget = {
      status: "legacy-api-only-unconfirmed",
      legacyBudgetUsd: planningSettings.budgetUsd,
    };
    setIncrementalCashBudget(unconfirmed);
    markPlanningRevision();
    if (completed && hasRecentScenario) {
      persistCompletedScenario(
        completed,
        planningSettings,
        selectedProvider,
        false,
        unconfirmed,
      );
    }
  }

  function addResource(presetId: SubscriptionPresetId) {
    if (
      resourceDrafts.length >= 4 ||
      resourceDrafts.some((draft) => draft.preset.id === presetId)
    ) {
      return;
    }
    let candidate = nextResourceNumber.current;
    const ids = new Set(resourceDrafts.map(({ uiId }) => uiId));
    while (ids.has(`resource-${candidate}`)) candidate += 1;
    nextResourceNumber.current = candidate + 1;
    const changedAt = new Date().toISOString();
    setResourceDrafts((current) => [
      ...current,
      {
        ...createDefaultAvailableAiResourceDraft({
          uiId: `resource-${candidate}`,
          presetId,
        }),
        displayName: bestFitCopy.resources.presets[presetId].name,
        surface: "",
      },
    ]);
    setResourceEvidenceObservedAtById((current) => ({
      ...current,
      [`resource-${candidate}`]:
        createAvailableAiResourceEvidenceObservedAt(changedAt),
    }));
    markPlanningRevision(changedAt);
    window.requestAnimationFrame(() =>
      document.getElementById(`resource-name-resource-${candidate}`)?.focus(),
    );
  }

  function updateResource(uiId: string, draft: AvailableAiResourceDraft) {
    const previous = resourceDrafts.find((item) => item.uiId === uiId);
    const currentObservedAt = resourceEvidenceObservedAtById[uiId];
    if (previous === undefined || currentObservedAt === undefined) return;
    const changedAt = new Date().toISOString();
    const evidenceUpdate = updateAvailableAiResourceEvidenceObservedAt(
      previous,
      draft,
      currentObservedAt,
      changedAt,
    );
    setResourceDrafts((current) =>
      current.map((item) => (item.uiId === uiId ? draft : item)),
    );
    setResourceEvidenceObservedAtById((current) => ({
      ...current,
      [uiId]: evidenceUpdate.observedAt,
    }));
    if (evidenceUpdate.evidenceChanged) markPlanningRevision(changedAt);
  }

  function removeResource(uiId: string) {
    const removedPresetId = resourceDrafts.find(
      (draft) => draft.uiId === uiId,
    )?.preset.id;
    const changedAt = new Date().toISOString();
    setResourceDrafts((current) => current.filter((draft) => draft.uiId !== uiId));
    setResourceEvidenceObservedAtById((current) => {
      const next = { ...current };
      delete next[uiId];
      return next;
    });
    markPlanningRevision(changedAt);
    window.requestAnimationFrame(() =>
      (removedPresetId
        ? document.getElementById(`add-resource-${removedPresetId}`)
        : null
      )?.focus(),
    );
  }

  function updateApiOverrides(
    overrides: readonly ApiCatalogOverride[],
    changedAt: string,
  ) {
    setApiOverrides(overrides);
    markPlanningRevision(changedAt);
  }

  function updateProvider(providerId: ProviderId) {
    setSelectedProvider(providerId);
    setVisibleError(null);
    if (!completed) return;

    setStatus("success");
    setAllocationNotice({ kind: "provider", providerId });
    if (hasRecentScenario && parsedSettings) {
      persistCompletedScenario(completed, parsedSettings, providerId, false);
    }
  }

  function updateMode(value: AnalysisMode) {
    setMode(value);
    invalidateAnalysis();
  }

  function clearStoredScenario() {
    if (clearRecentScenario()) {
      setHasRecentScenario(false);
      setStorageNotice({
        tone: "success",
        kind: "deleted",
        canClear: false,
      });
      return;
    }

    setStorageNotice({
      tone: "warning",
      kind: "delete-failed",
      canClear: hasRecentScenario,
    });
  }

  async function submitAnalysis(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedTasks = tasks.map((task) => ({
      ...task,
      name: task.name.trim(),
      description: task.description.trim(),
    }));
    const hasInvalidTask = normalizedTasks.some((task) => !task.name || !task.description);
    const planningSettings = parsePlanningSettings(settings);

    if (hasInvalidTask || !planningSettings) {
      setCompleted(null);
      setStatus("error");
      setShowValidation(true);
      setVisibleError({ kind: "invalid-form" });
      setAllocationNotice(null);
      window.requestAnimationFrame(() => {
        document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      });
      return;
    }

    setTasks(normalizedTasks);
    setStatus("loading");
    setShowValidation(false);
    setVisibleError(null);
    setCompleted(null);
    setAllocationNotice(null);

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 75_000);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, tasks: normalizedTasks }),
        signal: controller.signal,
      });
      const payload = (await response.json()) as AnalyzeApiResponse;

      if (!response.ok || !payload.ok) {
        const error: VisibleError = payload.ok
          ? { kind: "request-failed" }
          : { kind: "api", code: payload.error.code };
        setStatus("error");
        setVisibleError(error);
        return;
      }

      const completedSnapshot: CompletedAnalysis = {
        analysisSnapshot: {
          contractVersion: "best-fit-analysis-v2",
          compatibility: "best-fit",
          response: payload,
        },
        tasks: normalizedTasks.map((task) => ({ ...task })),
      };
      setCompleted(completedSnapshot);
      setStatus("success");
      markPlanningRevision(payload.generatedAt);
      persistCompletedScenario(
        completedSnapshot,
        planningSettings,
        selectedProvider,
        true,
        incrementalCashBudget,
      );
    } catch (error) {
      const timedOut = error instanceof DOMException && error.name === "AbortError";
      setStatus("error");
      setVisibleError({
        kind: timedOut ? "request-timeout" : "network-error",
        code: timedOut ? "REQUEST_TIMEOUT" : "NETWORK_ERROR",
      });
    } finally {
      window.clearTimeout(timeout);
    }
  }

  const statusMessage =
    status === "loading"
      ? copy.page.statusLoading(tasks.length)
      : status === "success"
        ? copy.page.statusSuccess(completed?.tasks.length ?? 0)
        : status === "error"
          ? copy.page.statusError
          : "";
  const renderedAllocationNotice = allocationNoticeMessage(allocationNotice, copy);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f4f5f0] pb-20 text-[#17221c] sm:pb-0">
      <div className="pointer-events-none fixed inset-0 opacity-70" aria-hidden="true">
        <div className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-[#d7e7d9] blur-3xl" />
        <div className="absolute -right-20 top-[-5rem] h-80 w-80 rounded-full bg-[#f3d9b3] blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-12">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#17221c]/10 pb-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#173f31] font-mono text-sm font-bold text-white shadow-[0_8px_24px_rgba(23,63,49,0.22)]">
              FW
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-[-0.01em]">{copy.common.productName}</p>
              <p className="text-xs text-[#536159]">{copy.page.headerSubtitle}</p>
            </div>
          </div>
          <span className="max-w-full rounded-full border border-[#173f31]/15 bg-white/70 px-3 py-1.5 text-xs font-semibold text-[#365649] backdrop-blur">
            {copy.page.headerBadge}
          </span>
        </header>

        <section className="py-10 sm:py-14">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#b85331]">
            {bestFitCopy.hero.eyebrow}
          </p>
          <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.45fr)] lg:items-end">
            <h1 className="max-w-4xl text-4xl font-semibold leading-[1.05] tracking-[-0.045em] text-[#12281f] sm:text-5xl lg:text-[3.5rem]">
              {bestFitCopy.hero.titleLine1}
              <br className="hidden sm:block" /> {bestFitCopy.hero.titleLine2}
            </h1>
            <p className="max-w-xl text-base leading-7 text-[#536159] lg:justify-self-end">
              {bestFitCopy.hero.description}
            </p>
          </div>
        </section>

        <form onSubmit={submitAnalysis} noValidate className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(330px,0.55fr)] xl:items-start">
          <TaskEditor
            tasks={tasks}
            disabled={status === "loading"}
            showValidation={showValidation}
            onAdd={addTask}
            onRemove={removeTask}
            onChange={updateTask}
            onPriorityChange={updateTaskPriority}
            onDeadlineChange={updateTaskDeadline}
            onFailureImpactChange={updateTaskFailureImpact}
            onLoadSample={loadSample}
          />

          <aside className="min-w-0 space-y-4 xl:sticky xl:top-5">
            <BudgetSettings
              value={settings}
              disabled={status === "loading"}
              showValidation={showValidation}
              incrementalCashBudget={incrementalCashBudget}
              onChange={updateSettings}
              onConfirmIncrementalCashBudget={confirmBudgetMeaning}
              onRevokeIncrementalCashBudget={revokeBudgetMeaning}
            />

            <section className="rounded-[1.5rem] border border-[#173f31]/12 bg-white/90 p-5 shadow-[0_18px_50px_rgba(28,47,37,0.08)] sm:p-6">
              <fieldset>
                <legend className="mb-2 text-sm font-bold text-[#34443b]">{copy.page.analysisModeLegend}</legend>
                <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#edf0eb] p-1.5">
                  {(["mock", "live"] as const).map((item) => (
                    <label key={item} className="cursor-pointer">
                      <input
                        type="radio"
                        name="analysis-mode"
                        value={item}
                        checked={mode === item}
                        onChange={() => updateMode(item)}
                        disabled={status === "loading"}
                        className="peer sr-only"
                      />
                      <span className="block rounded-xl px-3 py-3 text-[#647169] transition peer-checked:bg-white peer-checked:text-[#173f31] peer-checked:shadow-[0_4px_16px_rgba(26,48,37,0.1)] peer-focus-visible:ring-4 peer-focus-visible:ring-[#2f6c55]/20">
                        <span className="block text-sm font-bold">{copy.enums.analysisMode[item]}</span>
                        <span className="mt-0.5 block text-xs leading-5 opacity-80">
                          {item === "mock" ? copy.page.mockDescription : copy.page.liveDescription}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <p className="mt-4 rounded-xl border border-[#173f31]/10 bg-[#f7f8f4] px-3.5 py-3 text-xs leading-5 text-[#5f6d65]">
                {copy.page.storageDisclosure}
              </p>

              <button
                type="submit"
                disabled={status === "loading"}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#173f31] px-5 py-4 text-sm font-bold text-white shadow-[0_12px_28px_rgba(23,63,49,0.2)] transition hover:bg-[#205541] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2f6c55]/20 disabled:cursor-wait disabled:opacity-65"
              >
                {status === "loading" ? (
                  <>
                    <span className="size-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                    {copy.page.submitting(tasks.length)}
                  </>
                ) : (
                  <>
                    {mode === "mock" ? copy.page.submitMock : copy.page.submitLive}
                    <span aria-hidden="true">→</span>
                  </>
                )}
              </button>
              <p className="mt-3 text-center text-xs leading-5 text-[#66736b]">
                {copy.page.liveSafety}
              </p>
            </section>
          </aside>
        </form>

        <AvailableAiResources
          drafts={resourceDrafts}
          evidenceObservedAtById={resourceEvidenceObservedAtById}
          disabled={status === "loading"}
          onAdd={addResource}
          onChange={updateResource}
          onRemove={removeResource}
        />

        <CatalogOverrideEditor
          overrides={apiOverrides}
          pricingAsOf={pricingAsOf}
          disabled={status === "loading"}
          onChange={updateApiOverrides}
        />

        <p className="sr-only" aria-live="polite">
          {renderedAllocationNotice || statusMessage}
        </p>

        {storageNotice ? (
          <section
            className={`mt-6 rounded-2xl border p-4 sm:flex sm:items-center sm:justify-between sm:gap-5 ${
              storageNotice.tone === "success"
                ? "border-[#2f6c55]/20 bg-[#edf5ef] text-[#274d3d]"
                : "border-[#c88743]/25 bg-[#fff8ec] text-[#71491f]"
            }`}
          >
            <div>
              <p className="text-sm font-bold">{copy.page.storageTitle}</p>
              <p role="status" className="mt-1 text-sm leading-6">
                {storageNoticeMessage(storageNotice, copy, localeMeta.dateLocale)}
              </p>
              <p className="mt-1 text-xs leading-5 opacity-75">
                {copy.page.storagePlaintextReminder}
              </p>
            </div>
            {hasRecentScenario || storageNotice.canClear ? (
              <div className="mt-3 flex shrink-0 flex-wrap gap-2 sm:mt-0 sm:justify-end">
                {hasRecentScenario ? (
                  <button
                    type="button"
                    onClick={() => restoreRecentScenario(true)}
                    disabled={status === "loading"}
                    className="min-h-11 rounded-xl border border-current/20 px-3.5 py-2 text-xs font-bold transition hover:bg-white/60 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2f6c55]/15 disabled:opacity-45"
                  >
                    {copy.page.restoreRecent}
                  </button>
                ) : null}
                {storageNotice.canClear ? (
                  <button
                    type="button"
                    onClick={clearStoredScenario}
                    disabled={status === "loading"}
                    className="min-h-11 rounded-xl border border-current/20 px-3.5 py-2 text-xs font-bold transition hover:bg-white/60 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2f6c55]/15 disabled:opacity-45"
                  >
                    {copy.page.clearRecent}
                  </button>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : null}

        {storageChecked && status === "idle" && !completed ? (
          <section className="mt-6 rounded-2xl border border-dashed border-[#173f31]/20 bg-white/55 p-6 text-center sm:p-8">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#6b7a72]">
              {copy.page.emptyEyebrow}
            </p>
            <h2 className="mt-2 text-lg font-semibold text-[#2b4136]">{copy.page.emptyTitle}</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#66736b]">
              {copy.page.emptyDescription}
            </p>
          </section>
        ) : null}

        {status === "loading" ? (
          <section
            aria-busy="true"
            aria-label={copy.page.loadingTitle}
            className="mt-6 flex items-center gap-4 rounded-2xl border border-[#2f6c55]/15 bg-white/75 p-5"
          >
            <span className="size-6 shrink-0 animate-spin rounded-full border-2 border-[#2f6c55]/20 border-t-[#2f6c55]" />
            <div>
              <p className="font-bold text-[#294638]">{copy.page.loadingTitle}</p>
              <p className="mt-1 text-sm leading-6 text-[#66736b]">
                {copy.page.loadingDescription(tasks.length)}
              </p>
            </div>
          </section>
        ) : null}

        {visibleError && status === "error" ? (
          <div role="alert" className="mt-6 rounded-2xl border border-[#cf6845]/25 bg-[#fff5ef] p-5 text-[#7c331f]">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-[#cf6845]/12 font-bold">!</span>
              <div>
                <p className="font-bold">{copy.page.errorTitle}</p>
                <p className="mt-1 text-sm leading-6 text-[#91452d]">
                  {visibleErrorMessage(visibleError, copy)}
                </p>
                {visibleError.code ? (
                  <p className="mt-2 font-mono text-xs text-[#a45b43]">{visibleError.code}</p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {completed ? (
          <div className="mt-8">
            {completed.analysisSnapshot.compatibility !== "best-fit" ? (
              <section className="rounded-2xl border border-[#c88743]/25 bg-[#fff8ec] p-5 text-[#71491f]">
                <h2 className="font-bold">{bestFitCopy.results.analysisRequiredTitle}</h2>
                <p className="mt-1 text-sm leading-6">
                  {bestFitCopy.results.analysisRequiredDescription}
                </p>
              </section>
            ) : incrementalCashBudget?.status !== "confirmed" ? (
              <section className="rounded-2xl border border-[#c88743]/25 bg-[#fff8ec] p-5 text-[#71491f]">
                <h2 className="font-bold">{bestFitCopy.results.budgetRequiredTitle}</h2>
                <p className="mt-1 text-sm leading-6">
                  {bestFitCopy.results.budgetRequiredDescription}
                </p>
              </section>
            ) : bestFitPlanning?.ok ? (
              <BestFitResults
                result={bestFitPlanning.result}
                tasks={completed.tasks}
                generatedAt={planningAsOf ?? completed.analysisSnapshot.response.generatedAt}
              />
            ) : (
              <section role="alert" className="rounded-2xl border border-[#cf6845]/25 bg-[#fff5ef] p-5 text-[#7c331f]">
                <p className="font-bold">{bestFitCopy.results.calculationError}</p>
              </section>
            )}
          </div>
        ) : null}

        {completed && plan ? (
          <div className="mt-8">
            <section className="mb-4 rounded-2xl border border-[#173f31]/10 bg-white/70 px-5 py-4">
              <h2 className="font-bold text-[#294638]">
                {bestFitCopy.results.compatibilityView}
              </h2>
              <p className="mt-1 text-sm leading-6 text-[#607067]">
                {bestFitCopy.results.compatibilityDescription}
              </p>
            </section>
            <AnalysisResults
              sourceTasks={completed.tasks}
              plan={plan}
              providerComparisons={providerPlanning?.comparisons ?? []}
              selectedProvider={selectedProvider}
              onProviderChange={updateProvider}
              analysisMode={completed.analysisSnapshot.response.mode}
              analysisModel={completed.analysisSnapshot.response.model}
              analysisContract={completed.analysisSnapshot}
              generatedAt={completed.analysisSnapshot.response.generatedAt}
            />
          </div>
        ) : null}

        {completed && !plan ? (
          <div className="mt-6 rounded-2xl border border-[#c88743]/25 bg-[#fff8ec] p-4 text-sm text-[#71491f]">
            {copy.page.invalidSettingsForRecalculation}
          </div>
        ) : null}

        <footer className="mt-12 flex flex-col gap-2 border-t border-[#17221c]/10 py-5 text-xs text-[#68766e] sm:flex-row sm:items-center sm:justify-between">
          <span>{copy.page.footerClaim}</span>
          <span>{copy.page.footerBoundary}</span>
        </footer>
      </div>
    </main>
  );
}
