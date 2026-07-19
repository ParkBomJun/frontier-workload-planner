"use client";

import {
  type FormEvent,
  type KeyboardEvent,
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
import { BlockingIssuesDialog } from "@/components/blocking-issues-dialog";
import { BudgetSettings, type PlanningFormState } from "@/components/budget-settings";
import { CatalogOverrideEditor } from "@/components/catalog-override-editor";
import { LanguageSelector } from "@/components/language-selector";
import { useLanguage } from "@/components/language-provider";
import { PlanUpdateFeedback } from "@/components/plan-update-feedback";
import { ReferenceApiPlanSummary } from "@/components/reference-api-plan-summary";
import { TaskEditor } from "@/components/task-editor";
import { PROVIDER_CATALOG } from "@/config/provider-catalog";
import {
  MAX_AVAILABLE_AI_RESOURCES,
  type SubscriptionPresetId,
} from "@/config/subscription-presets";
import { SAMPLE_TASKS_BY_LOCALE } from "@/data/examples";
import { createMockAnalysis } from "@/lib/ai/mock-response";
import { MAX_TASKS } from "@/lib/ai/schema";
import { compareProviderPlans } from "@/lib/calculation/compare-providers";
import type { BestFitPlanExportContext } from "@/lib/export/best-fit";
import { shouldPreventImplicitFormSubmit } from "@/lib/form-submit";
import {
  BEST_FIT_UI_COPY,
  type BestFitUiCopy,
} from "@/lib/i18n/best-fit-ui-copy";
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
  bestFitPlanOutcomeFingerprint,
  compareBestFitPlanOutcome,
  type PlanOutcomeChange,
} from "@/lib/planning/plan-outcome";
import { resolvePlanUpdateFeedbackAction } from "@/lib/planning/plan-update-feedback";
import {
  createAvailableAiResourceEvidenceObservedAt,
  createDefaultAvailableAiResourceDraft,
  updateAvailableAiResourceEvidenceObservedAt,
} from "@/lib/planning/resource-drafts";
import {
  clearRecentScenario,
  confirmIncrementalCashBudget,
  loadRecentScenario,
  reconcileIncrementalCashBudget,
  saveRecentScenario,
  type IncrementalCashBudget,
} from "@/lib/storage/scenarios";
import {
  createBestFitSourceState,
  type BestFitSourceStateInput,
} from "@/lib/storage/best-fit-sources";
import type {
  AnalysisMode,
  AnalyzeApiResponse,
  AnalyzeSuccessResponse,
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

interface BlockingDialogState {
  description: string;
  issues: readonly string[];
  focusAfterClose?: string;
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
  | {
      kind: "settings";
      budgetUsd: number;
      strategy: PlanningStrategy;
      outcome: PlanOutcomeChange;
    }
  | { kind: "budget-pending"; budgetUsd: number }
  | { kind: "analysis"; taskCount: number; outcome: PlanOutcomeChange }
  | { kind: "provider"; providerId: ProviderId };

type PendingPlanOutcomeNotice =
  | {
      kind: "settings";
      previousFingerprint: string | null;
      budgetUsd: number;
      strategy: PlanningStrategy;
    }
  | {
      kind: "analysis";
      previousFingerprint: string | null;
      taskCount: number;
    };

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
  if (notice.kind === "budget-pending") {
    return copy.page.allocationBudgetPendingNotice(notice.budgetUsd);
  }
  if (notice.kind === "analysis") {
    const base = copy.page.statusSuccess(notice.taskCount);
    if (notice.outcome === "created") return base;
    return `${base} ${
      notice.outcome === "changed"
        ? copy.page.allocationResultChanged
        : copy.page.allocationResultUnchanged
    }`;
  }
  if (notice.kind === "settings") {
    const base = copy.page.allocationSettingsNotice(
      notice.budgetUsd,
      copy.enums.strategy[notice.strategy],
    );
    if (notice.outcome === "created") return base;
    return `${base} ${
      notice.outcome === "changed"
        ? copy.page.allocationResultChanged
        : copy.page.allocationResultUnchanged
    }`;
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

function planningSettingIssues(
  value: PlanningFormState,
  copy: UiCopy,
): string[] {
  const issues: string[] = [];
  const budget = Number(value.budgetUsd);
  const deadline = Number(value.deadlineDays);
  if (!Number.isFinite(budget) || budget < 0.01 || budget > 10_000) {
    issues.push(copy.budgetSettings.budgetError);
  }
  if (!Number.isInteger(deadline) || deadline < 1 || deadline > 90) {
    issues.push(copy.budgetSettings.deadlineError);
  }
  return issues;
}

function planningSettingFocusSelector(value: PlanningFormState): string {
  const budget = Number(value.budgetUsd);
  if (!Number.isFinite(budget) || budget < 0.01 || budget > 10_000) {
    return "#budget-usd";
  }
  return "#deadline-days";
}

function analysisInputIssues(
  tasks: readonly TaskInput[],
  settings: PlanningFormState,
  copy: UiCopy,
): string[] {
  return [
    ...tasks.flatMap((task, index) => {
      const label = copy.taskEditor.taskLabel(index + 1);
      const issues: string[] = [];
      if (!task.name.trim()) {
        issues.push(`${label}: ${copy.taskEditor.nameRequired}`);
      }
      if (!task.description.trim()) {
        issues.push(`${label}: ${copy.taskEditor.descriptionRequired}`);
      }
      return issues;
    }),
    ...planningSettingIssues(settings, copy),
  ];
}

function serverInputIssues(
  details: readonly { path: string; message: string }[],
  copy: UiCopy,
  bestFitCopy: BestFitUiCopy,
): string[] {
  const issues = details.map(({ path }) => {
    const match = path.match(/^tasks\.(\d+)(?:\.([^.]+))?/);
    if (match) {
      const taskIndex = Number(match[1]);
      const taskLabel = Number.isSafeInteger(taskIndex)
        ? copy.taskEditor.taskLabel(taskIndex + 1)
        : copy.taskEditor.title;
      const field = match[2];
      const fieldLabel =
        field === "name"
          ? copy.taskEditor.nameLabel
          : field === "description"
            ? copy.taskEditor.descriptionLabel
            : field === "priority"
              ? copy.taskEditor.priorityLabel
              : field === "deadlineDate"
                ? copy.taskEditor.deadlineLabel
                : field === "failureImpact"
                  ? copy.taskEditor.failureImpactLabel
                  : copy.taskEditor.title;
      return bestFitCopy.validation.checkField(`${taskLabel} · ${fieldLabel}`);
    }
    if (path === "mode") {
      return bestFitCopy.validation.checkField(copy.page.analysisModeLegend);
    }
    return copy.page.invalidInput;
  });
  return [...new Set(issues.length > 0 ? issues : [copy.page.invalidInput])];
}

function nextAvailableTaskNumber(tasks: TaskInput[], startAt = 1): number {
  const taskIds = new Set(tasks.map((task) => task.id));
  let candidate = Math.max(1, startAt);
  while (taskIds.has(`task-${candidate}`)) candidate += 1;
  return candidate;
}

function nextAvailableResourceNumber(
  drafts: readonly AvailableAiResourceDraft[],
  startAt = 1,
): number {
  const uiIds = new Set(drafts.map(({ uiId }) => uiId));
  let candidate = Math.max(1, startAt);
  while (uiIds.has(`resource-${candidate}`)) candidate += 1;
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
  const liveAnalysisEnabled =
    process.env.NEXT_PUBLIC_LIVE_ANALYSIS_ENABLED === "true";
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
  const [blockingDialog, setBlockingDialog] =
    useState<BlockingDialogState | null>(null);
  const [storageChecked, setStorageChecked] = useState(false);
  const [hasRecentScenario, setHasRecentScenario] = useState(false);
  const [scenarioRestoreEpoch, setScenarioRestoreEpoch] = useState(0);
  const [storageNotice, setStorageNotice] = useState<StorageNotice | null>(null);
  const [allocationNotice, setAllocationNotice] = useState<AllocationNotice | null>(null);
  const [pendingPlanOutcomeNotice, setPendingPlanOutcomeNotice] =
    useState<PendingPlanOutcomeNotice | null>(null);
  const [allocationNoticeEpoch, advanceAllocationNoticeEpoch] = useReducer(
    (value: number) => value + 1,
    0,
  );
  const nextTaskNumber = useRef(2);
  const nextResourceNumber = useRef(1);
  const latestBestFitOutcomeFingerprint = useRef<string | null>(null);
  const automaticRestore = useRef({ settled: false, userInteracted: false });
  const lastValidBestFitSettings = useRef<BestFitRelevantSettings>({
    budgetUsd: Number(INITIAL_SETTINGS.budgetUsd),
    strategy: INITIAL_SETTINGS.strategy,
  });

  const publishAllocationNotice = useCallback((notice: AllocationNotice) => {
    setAllocationNotice(notice);
    advanceAllocationNoticeEpoch();
  }, []);
  const dismissAllocationNotice = useCallback(() => {
    setAllocationNotice(null);
  }, []);

  const restoreRecentScenario = useCallback((announceEmpty = true) => {
    setAllocationNotice(null);
    setPendingPlanOutcomeNotice(null);
    latestBestFitOutcomeFingerprint.current = null;
    const result = loadRecentScenario();

    if (result.status === "loaded") {
      const restoredAt = new Date().toISOString();
      const restoredTasks = result.scenario.tasks.map((task) => ({ ...task }));
      const restoredSnapshot = result.scenario.analysisSnapshot;
      const restoredResourceDrafts =
        result.scenario.bestFitSources.availableAiResources.drafts.map((draft) =>
          structuredClone(draft),
        );
      const restoredResourceEvidenceObservedAtById = structuredClone(
        result.scenario.bestFitSources.availableAiResources
          .evidenceObservedAtById,
      );
      const restoredApiOverrides =
        result.scenario.bestFitSources.apiCatalogOverrides.overrides.map(
          (override) => structuredClone(override),
        );
      lastValidBestFitSettings.current = {
        budgetUsd: result.scenario.settings.budgetUsd,
        strategy: result.scenario.settings.strategy,
      };
      setTasks(restoredTasks);
      setSettings(planningFormState(result.scenario.settings));
      setIncrementalCashBudget(result.scenario.settings.incrementalCashBudget);
      setResourceDrafts(restoredResourceDrafts);
      setResourceEvidenceObservedAtById(
        restoredResourceEvidenceObservedAtById,
      );
      setApiOverrides(restoredApiOverrides);
      setScenarioRestoreEpoch((current) => current + 1);
      const restoredRevisionAt = resolveRestoredPlanningRevisionAt({
        restoredAt,
        generatedAt: restoredSnapshot.response.generatedAt,
        confirmedAt:
          result.scenario.settings.incrementalCashBudget.status === "confirmed"
            ? result.scenario.settings.incrementalCashBudget.confirmedAt
            : null,
        resourceEvidenceObservedAt: Object.values(
          restoredResourceEvidenceObservedAtById,
        ).flatMap((timestamps) => Object.values(timestamps)),
        overrideRecordedAt: restoredApiOverrides.map(
          (override) => override.recordedAt,
        ),
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
      nextResourceNumber.current = nextAvailableResourceNumber(
        restoredResourceDrafts,
      );
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
    const restoreTimer = window.setTimeout(() => {
      automaticRestore.current.settled = true;
      if (automaticRestore.current.userInteracted) {
        setStorageChecked(true);
        return;
      }
      restoreRecentScenario(false);
    }, 0);
    return () => window.clearTimeout(restoreTimer);
  }, [restoreRecentScenario]);

  function preserveUserInputBeforeAutomaticRestore() {
    if (!automaticRestore.current.settled) {
      automaticRestore.current.userInteracted = true;
    }
  }

  function preventImplicitAnalysisSubmit(event: KeyboardEvent<HTMLFormElement>) {
    const target = event.target;
    if (
      target instanceof HTMLInputElement &&
      shouldPreventImplicitFormSubmit(event.key, target.type, event.nativeEvent.isComposing)
    ) {
      event.preventDefault();
    }
  }

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
  const bestFitSourceState = useMemo(
    () =>
      createBestFitSourceState({
        resourceDrafts,
        resourceEvidenceObservedAtById,
        apiOverrides,
      }),
    [apiOverrides, resourceDrafts, resourceEvidenceObservedAtById],
  );
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
  const currentBestFitOutcomeFingerprint = useMemo(
    () =>
      bestFitPlanning?.ok
        ? bestFitPlanOutcomeFingerprint(bestFitPlanning.result.plan)
        : null,
    [bestFitPlanning],
  );

  useEffect(() => {
    if (currentBestFitOutcomeFingerprint === null) {
      if (pendingPlanOutcomeNotice === null || bestFitPlanning?.ok !== false) {
        return;
      }
      const frame = window.requestAnimationFrame(() => {
        setPendingPlanOutcomeNotice(null);
      });
      return () => window.cancelAnimationFrame(frame);
    }

    latestBestFitOutcomeFingerprint.current = currentBestFitOutcomeFingerprint;
    if (pendingPlanOutcomeNotice === null) return;

    const outcome = compareBestFitPlanOutcome(
      pendingPlanOutcomeNotice.previousFingerprint,
      currentBestFitOutcomeFingerprint,
    );
    const frame = window.requestAnimationFrame(() => {
      if (pendingPlanOutcomeNotice.kind === "settings") {
        publishAllocationNotice({
          kind: "settings",
          budgetUsd: pendingPlanOutcomeNotice.budgetUsd,
          strategy: pendingPlanOutcomeNotice.strategy,
          outcome,
        });
      } else {
        publishAllocationNotice({
          kind: "analysis",
          taskCount: pendingPlanOutcomeNotice.taskCount,
          outcome,
        });
      }
      setPendingPlanOutcomeNotice(null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [
    currentBestFitOutcomeFingerprint,
    bestFitPlanning,
    pendingPlanOutcomeNotice,
    publishAllocationNotice,
  ]);

  const bestFitExportContext = useMemo<BestFitPlanExportContext | null>(() => {
    if (
      !completed ||
      completed.analysisSnapshot.compatibility !== "best-fit" ||
      !bestFitPlanning?.ok ||
      bestFitSourceState === null
    ) {
      return null;
    }
    return {
      sourceTasks: completed.tasks,
      uiPlan: bestFitPlanning.result,
      sourceState: bestFitSourceState,
      analysisMode: completed.analysisSnapshot.response.mode,
      analysisModel: completed.analysisSnapshot.response.model,
      generatedAt: completed.analysisSnapshot.response.generatedAt,
    };
  }, [bestFitPlanning, bestFitSourceState, completed]);
  const showReferencePlan =
    bestFitPlanning?.ok === true &&
    bestFitPlanning.result.plan.activeTaskCount === 0 &&
    bestFitPlanning.result.plan.infeasibleTaskCount > 0 &&
    (providerPlanning?.comparisons.some(
      (comparison) => comparison.activeTaskCount > 0,
    ) ?? false);

  function persistCompletedScenario(
    snapshot: CompletedAnalysis,
    planningSettings: PlanningSettings,
    providerId: ProviderId,
    announceSuccess: boolean,
    nextIncrementalCashBudget: IncrementalCashBudget | null = incrementalCashBudget,
    nextBestFitSources: BestFitSourceStateInput = {
      resourceDrafts,
      resourceEvidenceObservedAtById,
      apiOverrides,
    },
  ) {
    const bestFitSources = createBestFitSourceState(nextBestFitSources);
    if (bestFitSources === null) {
      setStorageNotice({
        tone: "warning",
        kind: "invalid",
        canClear: hasRecentScenario,
      });
      return;
    }
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
      bestFitSources,
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
    setPendingPlanOutcomeNotice(null);
    latestBestFitOutcomeFingerprint.current = null;
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
    publishAllocationNotice({
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
    const feedbackAction = resolvePlanUpdateFeedbackAction({
      kind: "settings-edited",
      hasCompletedAnalysis: completed !== null,
      hasValidPlanningSettings: nextPlanningSettings !== null,
      relevantSettingsChanged: relevantTransition.changed,
      budgetConfirmed: nextIncrementalCashBudget?.status === "confirmed",
    });
    if (completed && nextPlanningSettings) {
      if (feedbackAction !== "none") {
        markPlanningRevision();
        if (feedbackAction === "recalculate") {
          setAllocationNotice(null);
          setPendingPlanOutcomeNotice({
            kind: "settings",
            previousFingerprint: latestBestFitOutcomeFingerprint.current,
            budgetUsd: nextPlanningSettings.budgetUsd,
            strategy: nextPlanningSettings.strategy,
          });
        } else {
          setPendingPlanOutcomeNotice(null);
          publishAllocationNotice({
            kind: "budget-pending",
            budgetUsd: nextPlanningSettings.budgetUsd,
          });
        }
      } else {
        setPendingPlanOutcomeNotice(null);
        if (nextIncrementalCashBudget?.status === "confirmed") {
          setAllocationNotice(null);
        }
      }
    } else {
      setAllocationNotice(null);
      setPendingPlanOutcomeNotice(null);
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
    if (!planningSettings) {
      setShowValidation(true);
      setBlockingDialog({
        description: bestFitCopy.validation.budgetDescription,
        issues: planningSettingIssues(settings, copy),
        focusAfterClose: planningSettingFocusSelector(settings),
      });
      return;
    }
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
    const feedbackAction = resolvePlanUpdateFeedbackAction({
      kind: "budget-confirmed",
      hasCompletedAnalysis: completed !== null,
    });
    if (feedbackAction === "recalculate" && completed) {
      setAllocationNotice(null);
      setPendingPlanOutcomeNotice({
        kind: "settings",
        previousFingerprint: latestBestFitOutcomeFingerprint.current,
        budgetUsd: planningSettings.budgetUsd,
        strategy: planningSettings.strategy,
      });
    }
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
    if (!planningSettings) {
      setShowValidation(true);
      setBlockingDialog({
        description: bestFitCopy.validation.budgetDescription,
        issues: planningSettingIssues(settings, copy),
        focusAfterClose: planningSettingFocusSelector(settings),
      });
      return;
    }
    const unconfirmed: IncrementalCashBudget = {
      status: "legacy-api-only-unconfirmed",
      legacyBudgetUsd: planningSettings.budgetUsd,
    };
    setIncrementalCashBudget(unconfirmed);
    markPlanningRevision();
    if (completed) {
      setPendingPlanOutcomeNotice(null);
      publishAllocationNotice({
        kind: "budget-pending",
        budgetUsd: planningSettings.budgetUsd,
      });
    }
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
      resourceDrafts.length >= MAX_AVAILABLE_AI_RESOURCES
    ) {
      return;
    }
    let candidate = nextResourceNumber.current;
    const ids = new Set(resourceDrafts.map(({ uiId }) => uiId));
    while (ids.has(`resource-${candidate}`)) candidate += 1;
    nextResourceNumber.current = candidate + 1;
    const changedAt = new Date().toISOString();
    const nextDraft: AvailableAiResourceDraft = {
      ...createDefaultAvailableAiResourceDraft({
        uiId: `resource-${candidate}`,
        presetId,
      }),
      displayName: bestFitCopy.resources.presets[presetId].name,
    };
    const nextResourceDrafts = [...resourceDrafts, nextDraft];
    const nextResourceEvidenceObservedAtById = {
      ...resourceEvidenceObservedAtById,
      [`resource-${candidate}`]:
        createAvailableAiResourceEvidenceObservedAt(changedAt),
    };
    setResourceDrafts(nextResourceDrafts);
    setResourceEvidenceObservedAtById(
      nextResourceEvidenceObservedAtById,
    );
    markPlanningRevision(changedAt);
    if (completed && hasRecentScenario && parsedSettings) {
      persistCompletedScenario(
        completed,
        parsedSettings,
        selectedProvider,
        false,
        incrementalCashBudget,
        {
          resourceDrafts: nextResourceDrafts,
          resourceEvidenceObservedAtById:
            nextResourceEvidenceObservedAtById,
          apiOverrides,
        },
      );
    }
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
    const nextResourceDrafts = resourceDrafts.map((item) =>
      item.uiId === uiId ? draft : item,
    );
    const nextResourceEvidenceObservedAtById = {
      ...resourceEvidenceObservedAtById,
      [uiId]: evidenceUpdate.observedAt,
    };
    setResourceDrafts(nextResourceDrafts);
    setResourceEvidenceObservedAtById(
      nextResourceEvidenceObservedAtById,
    );
    if (evidenceUpdate.evidenceChanged) markPlanningRevision(changedAt);
    if (completed && hasRecentScenario && parsedSettings) {
      persistCompletedScenario(
        completed,
        parsedSettings,
        selectedProvider,
        false,
        incrementalCashBudget,
        {
          resourceDrafts: nextResourceDrafts,
          resourceEvidenceObservedAtById:
            nextResourceEvidenceObservedAtById,
          apiOverrides,
        },
      );
    }
  }

  function removeResource(uiId: string) {
    const removedPresetId = resourceDrafts.find(
      (draft) => draft.uiId === uiId,
    )?.preset.id;
    const changedAt = new Date().toISOString();
    const nextResourceDrafts = resourceDrafts.filter(
      (draft) => draft.uiId !== uiId,
    );
    const nextResourceEvidenceObservedAtById = {
      ...resourceEvidenceObservedAtById,
    };
    delete nextResourceEvidenceObservedAtById[uiId];
    setResourceDrafts(nextResourceDrafts);
    setResourceEvidenceObservedAtById(
      nextResourceEvidenceObservedAtById,
    );
    markPlanningRevision(changedAt);
    if (completed && hasRecentScenario && parsedSettings) {
      persistCompletedScenario(
        completed,
        parsedSettings,
        selectedProvider,
        false,
        incrementalCashBudget,
        {
          resourceDrafts: nextResourceDrafts,
          resourceEvidenceObservedAtById:
            nextResourceEvidenceObservedAtById,
          apiOverrides,
        },
      );
    }
    window.requestAnimationFrame(() =>
      (removedPresetId
        ? document.getElementById("add-resource-select")
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
    if (completed && hasRecentScenario && parsedSettings) {
      persistCompletedScenario(
        completed,
        parsedSettings,
        selectedProvider,
        false,
        incrementalCashBudget,
        {
          resourceDrafts,
          resourceEvidenceObservedAtById,
          apiOverrides: overrides,
        },
      );
    }
  }

  function updateProvider(providerId: ProviderId) {
    setSelectedProvider(providerId);
    setVisibleError(null);
    if (!completed) return;

    setStatus("success");
    publishAllocationNotice({ kind: "provider", providerId });
    if (hasRecentScenario && parsedSettings) {
      persistCompletedScenario(completed, parsedSettings, providerId, false);
    }
  }

  function openReferencePlanDetails() {
    const details = document.getElementById(
      "reference-api-plan-details",
    ) as HTMLDetailsElement | null;
    if (!details) return;
    details.open = true;
    requestAnimationFrame(() => {
      const summary = details.querySelector<HTMLElement>("summary");
      summary?.scrollIntoView({ behavior: "smooth", block: "start" });
      summary?.focus({ preventScroll: true });
    });
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
      const issues = analysisInputIssues(normalizedTasks, settings, copy);
      setCompleted(null);
      setStatus("error");
      setShowValidation(true);
      setVisibleError({ kind: "invalid-form" });
      setBlockingDialog({
        description: bestFitCopy.validation.description,
        issues,
        focusAfterClose: '[aria-invalid="true"]',
      });
      setAllocationNotice(null);
      setPendingPlanOutcomeNotice(null);
      return;
    }

    if (incrementalCashBudget?.status !== "confirmed") {
      setCompleted(null);
      setStatus("error");
      setVisibleError({ kind: "invalid-form" });
      setBlockingDialog({
        description: bestFitCopy.results.budgetRequiredDescription,
        issues: [bestFitCopy.validation.confirmBudgetIssue],
        focusAfterClose: "#confirm-incremental-cash-budget",
      });
      setAllocationNotice(null);
      setPendingPlanOutcomeNotice(null);
      return;
    }

    setTasks(normalizedTasks);
    setStatus("loading");
    setShowValidation(false);
    setVisibleError(null);
    setCompleted(null);
    setAllocationNotice(null);
    setPendingPlanOutcomeNotice(null);

    const acceptSuccessfulAnalysis = (payload: AnalyzeSuccessResponse) => {
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
      setPendingPlanOutcomeNotice({
        kind: "analysis",
        previousFingerprint: latestBestFitOutcomeFingerprint.current,
        taskCount: completedSnapshot.tasks.length,
      });
      markPlanningRevision(payload.generatedAt);
      persistCompletedScenario(
        completedSnapshot,
        planningSettings,
        selectedProvider,
        true,
        incrementalCashBudget,
      );
    };

    if (mode === "mock") {
      acceptSuccessfulAnalysis({
        ok: true,
        mode: "mock",
        model: "mock-fixture-v2",
        generatedAt: new Date().toISOString(),
        analysis: createMockAnalysis(normalizedTasks),
      });
      return;
    }

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
        if (
          !payload.ok &&
          payload.error.code === "INVALID_INPUT" &&
          payload.error.details &&
          payload.error.details.length > 0
        ) {
          setBlockingDialog({
            description: bestFitCopy.validation.description,
            issues: serverInputIssues(payload.error.details, copy, bestFitCopy),
          });
        }
        return;
      }

      acceptSuccessfulAnalysis(payload);
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
      : status === "error"
        ? copy.page.statusError
        : "";
  const renderedAllocationNotice = allocationNoticeMessage(allocationNotice, copy);
  const allocationNoticePending = allocationNotice?.kind === "budget-pending";

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f4f5f0] text-[#17221c]">
      <BlockingIssuesDialog
        open={blockingDialog !== null}
        title={bestFitCopy.validation.title}
        description={blockingDialog?.description ?? ""}
        issues={blockingDialog?.issues ?? []}
        closeLabel={bestFitCopy.validation.close}
        focusAfterClose={blockingDialog?.focusAfterClose}
        onClose={() => setBlockingDialog(null)}
      />
      <div className="pointer-events-none fixed inset-0 opacity-70" aria-hidden="true">
        <div className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-[#d7e7d9] blur-3xl" />
        <div className="absolute -right-20 top-[-5rem] h-80 w-80 rounded-full bg-[#f3d9b3] blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-12">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#17221c]/10 pb-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#173f31] font-mono text-sm font-bold text-white shadow-[0_8px_24px_rgba(23,63,49,0.22)]">
              NM
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-[-0.01em]">{copy.common.productName}</p>
              <p className="text-xs text-[#536159]">{copy.page.headerSubtitle}</p>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <span className="hidden max-w-full rounded-full border border-[#173f31]/15 bg-white/70 px-3 py-1.5 text-xs font-semibold text-[#365649] backdrop-blur sm:inline-flex">
              {copy.page.headerBadge}
            </span>
            <LanguageSelector />
          </div>
        </header>

        <section className="py-8 sm:py-10">
          <p className="text-balance text-xs font-bold leading-5 tracking-[-0.01em] text-[#b85331]">
            {bestFitCopy.hero.eyebrow}
          </p>
          <div className="mt-3 grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(380px,0.65fr)] lg:items-start">
            <h1 className="min-w-0 max-w-4xl break-keep break-words text-4xl font-semibold leading-[1.05] tracking-[-0.045em] text-[#12281f] sm:text-5xl lg:text-[3.25rem]">
              {bestFitCopy.hero.titleLine1}
              <br className="hidden sm:block" /> {bestFitCopy.hero.titleLine2}
            </h1>
            <p className="max-w-[30rem] text-balance text-base leading-7 text-[#536159] lg:justify-self-end lg:pt-1">
              {bestFitCopy.hero.description}
            </p>
          </div>
        </section>

        <form
          onSubmit={submitAnalysis}
          onPointerDownCapture={preserveUserInputBeforeAutomaticRestore}
          onKeyDownCapture={preserveUserInputBeforeAutomaticRestore}
          onKeyDown={preventImplicitAnalysisSubmit}
          onInputCapture={preserveUserInputBeforeAutomaticRestore}
          noValidate
          className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(330px,0.55fr)] xl:items-start"
        >
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

          <div className="min-w-0 xl:sticky xl:top-5">
            <BudgetSettings
              value={settings}
              disabled={status === "loading"}
              showValidation={showValidation}
              incrementalCashBudget={incrementalCashBudget}
              onChange={updateSettings}
              onConfirmIncrementalCashBudget={confirmBudgetMeaning}
              onRevokeIncrementalCashBudget={revokeBudgetMeaning}
            />
          </div>

          <div className="min-w-0 xl:col-span-2">
            <AvailableAiResources
              key={scenarioRestoreEpoch}
              drafts={resourceDrafts}
              evidenceObservedAtById={resourceEvidenceObservedAtById}
              disabled={status === "loading"}
              onAdd={addResource}
              onChange={updateResource}
              onRemove={removeResource}
            />
          </div>

          <section className="rounded-[1.5rem] border border-[#173f31]/12 bg-white/90 p-5 shadow-[0_18px_50px_rgba(28,47,37,0.08)] sm:p-6 xl:col-span-2">
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.55fr)] lg:items-center">
              <div className="min-w-0">
                <fieldset>
                  <legend className="text-sm font-bold text-[#34443b]">
                    {copy.page.analysisModeLegend}
                  </legend>
                  <div className="mt-2 grid grid-cols-2 gap-2 rounded-2xl bg-[#edf0eb] p-1.5 sm:max-w-xl">
                    {(["mock", "live"] as const).map((item) => (
                      <label
                        key={item}
                        className={
                          item === "live" && !liveAnalysisEnabled
                            ? "cursor-not-allowed opacity-55"
                            : "cursor-pointer"
                        }
                      >
                        <input
                          type="radio"
                          name="analysis-mode"
                          value={item}
                          checked={mode === item}
                          onChange={() => updateMode(item)}
                          disabled={
                            status === "loading" ||
                            (item === "live" && !liveAnalysisEnabled)
                          }
                          className="peer sr-only"
                        />
                        <span className="block h-full rounded-xl px-3 py-2.5 text-[#647169] transition peer-checked:bg-white peer-checked:text-[#173f31] peer-checked:shadow-[0_4px_16px_rgba(26,48,37,0.1)] peer-focus-visible:ring-4 peer-focus-visible:ring-[#2f6c55]/20">
                          <span className="block text-sm font-bold">
                            {copy.enums.analysisMode[item]}
                          </span>
                          <span className="mt-0.5 block text-xs leading-5 opacity-80">
                            {item === "mock"
                              ? copy.page.mockDescription
                              : liveAnalysisEnabled
                                ? copy.page.liveDescription
                                : copy.page.liveDisabled}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <p className="mt-2 text-xs leading-5 text-[#66736b]">
                  {copy.page.storageDisclosure}
                </p>
              </div>

              <div className="min-w-0">
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#173f31] px-5 py-3.5 text-sm font-bold text-white shadow-[0_12px_28px_rgba(23,63,49,0.2)] transition hover:bg-[#205541] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2f6c55]/20 disabled:cursor-wait disabled:opacity-65"
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
                <p className="mx-auto mt-3 max-w-lg whitespace-pre-line text-center text-xs leading-5 text-[#66736b]">
                  {mode === "live" ? copy.page.liveSafety : copy.page.mockSafety}
                </p>
              </div>
            </div>
          </section>
        </form>

        <CatalogOverrideEditor
          key={scenarioRestoreEpoch}
          overrides={apiOverrides}
          pricingAsOf={pricingAsOf}
          disabled={status === "loading"}
          onChange={updateApiOverrides}
        />

        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {statusMessage}
        </p>

        {renderedAllocationNotice ? (
          <PlanUpdateFeedback
            key={allocationNoticeEpoch}
            message={renderedAllocationNotice}
            pending={allocationNoticePending}
            dismissLabel={copy.page.allocationDismiss}
            onDismiss={dismissAllocationNotice}
          />
        ) : null}

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
              <p
                role={
                  allocationNotice === null && pendingPlanOutcomeNotice === null
                    ? "status"
                    : undefined
                }
                className="mt-1 text-sm leading-6"
              >
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
          <section className="mt-6 rounded-2xl border border-dashed border-[#173f31]/20 bg-white/55 px-5 py-4 text-center">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#6b7a72]">
              {copy.page.emptyEyebrow}
            </p>
            <h2 className="mt-1.5 text-base font-semibold text-[#2b4136]">
              {copy.page.emptyTitle}
            </h2>
            <p className="mx-auto mt-1 max-w-xl text-sm leading-6 text-[#66736b]">
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
            ) : bestFitPlanning?.ok && bestFitExportContext ? (
              <BestFitResults
                result={bestFitPlanning.result}
                tasks={completed.tasks}
                generatedAt={planningAsOf ?? completed.analysisSnapshot.response.generatedAt}
                exportContext={bestFitExportContext}
                referencePlanAvailable={showReferencePlan}
              />
            ) : (
              <section role="alert" className="rounded-2xl border border-[#cf6845]/25 bg-[#fff5ef] p-5 text-[#7c331f]">
                <p className="font-bold">{bestFitCopy.results.calculationError}</p>
              </section>
            )}
          </div>
        ) : null}

        {completed && plan && providerPlanning && showReferencePlan ? (
          <ReferenceApiPlanSummary
            plan={plan}
            comparisons={providerPlanning.comparisons}
            selectedProvider={selectedProvider}
            onProviderChange={updateProvider}
            onOpenDetails={openReferencePlanDetails}
          />
        ) : null}

        {completed && plan ? (
          <details
            id="reference-api-plan-details"
            data-reference-plan={showReferencePlan ? "reference-details" : "optional"}
            className="group mt-6 rounded-2xl border border-[#173f31]/10 bg-white/70"
          >
            <summary className="min-h-11 cursor-pointer list-none rounded-2xl px-5 py-4 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2f6c55]/15 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center justify-between gap-4">
                <span>
                  <span className="block font-bold text-[#294638]">
                    {showReferencePlan
                      ? bestFitCopy.results.referencePlanView
                      : bestFitCopy.results.compatibilityView}
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-[#607067]">
                    {showReferencePlan
                      ? bestFitCopy.results.referencePlanDescription
                      : bestFitCopy.results.compatibilityDescription}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className="shrink-0 text-xl text-[#456455] transition group-open:rotate-45"
                >
                  +
                </span>
              </span>
            </summary>
            <div className="border-t border-[#173f31]/10 p-4 sm:p-5">
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
                referenceOnly={showReferencePlan}
              />
            </div>
          </details>
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
