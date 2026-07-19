"use client";

import { useId, useRef } from "react";

import { useLanguage } from "@/components/language-provider";
import { PROVIDER_CATALOG } from "@/config/provider-catalog";
import { fromMicroUsd } from "@/lib/calculation/micro-usd";
import type { BestFitPlanExportContext } from "@/lib/export/best-fit";
import {
  BEST_FIT_UI_COPY,
  isBestFitExclusionReasonCode,
  type BestFitUiCopy,
} from "@/lib/i18n/best-fit-ui-copy";
import {
  resourceDraftFieldLabel,
  resourceDraftFieldTargetId,
} from "@/lib/i18n/resource-draft-field-label";
import {
  SUBSCRIPTION_USAGE_PERCENT_KEYS,
  subscriptionUsageBottleneckPercent,
} from "@/lib/subscriptions/usage-snapshot";
import type {
  BestFitResourceDiagnostic,
  BestFitUiPlan,
} from "@/lib/planning/best-fit-ui-plan";
import type { AvailableAiResourceDraftField } from "@/types/resource-drafts";
import type { RouteIdentity } from "@/types/offerings";
import type { TaskInput } from "@/types/domain";

import { BestFitExportActions } from "./best-fit-export-actions";

interface BestFitResultsProps {
  result: BestFitUiPlan;
  tasks: readonly TaskInput[];
  generatedAt: string;
  exportContext: BestFitPlanExportContext;
  referencePlanAvailable?: boolean;
}

const PROVIDER_API_SETUP_URLS: Readonly<
  Record<keyof typeof PROVIDER_CATALOG, string>
> = {
  openai: "https://developers.openai.com/api/docs/quickstart",
  anthropic: "https://platform.claude.com/docs/en/get-started",
  google: "https://ai.google.dev/gemini-api/docs/get-started",
};

const SYSTEM_EVIDENCE_REASONS = new Set([
  "catalog-reference-unresolved",
  "catalog-version-mismatch",
  "catalog-claim-mismatch",
  "connector-unverified",
  "connector-binding-mismatch",
  "connector-snapshot-stale",
  "connector-snapshot-replayed",
  "connector-receipt-invalid",
  "evidence-authority-invalid",
  "profile-unverified",
  "model-limits-incomplete",
  "access-limits-incomplete",
  "model-capabilities-incomplete",
  "access-capabilities-incomplete",
  "initial-capacity-unpublished",
  "api-route-not-confirmed",
  "model-reference-missing",
  "catalog-entry-not-found",
  "catalog-price-schedule-invalid",
  "catalog-invocation-limits-unresolved",
]);
const TASK_CONSTRAINT_REASONS = new Set([
  "input-limit-exceeded",
  "output-limit-exceeded",
  "context-limit-exceeded",
  "invocation-limit-exceeded",
  "standard-price-input-limit-exceeded",
  "below-minimum-quality",
  "required-capability-missing",
]);

const RESOURCE_FIELD_PRIORITY: readonly AvailableAiResourceDraftField[] = [
  "preset.id",
  "preset.version",
  "displayName",
  "ownership",
  "availability",
  "surface",
  "feeUsd",
  "quota.kind",
  "quota.unit",
  "quota.included",
  "quota.remaining",
  "quota.remainingPercent",
  "quota.consumption.basis",
  "quota.consumption.low",
  "quota.consumption.expected",
  "quota.consumption.high",
  "quota.consumption.sampleSize",
  "reset.kind",
  "reset.nextResetAt",
  "reset.cadenceDays",
  "reset.windowHours",
  "quota.description",
];

interface InfeasibleExplanationProps {
  taskId: string;
  taskName: string;
  excludedRoutes: BestFitUiPlan["candidateSets"][number]["excludedRoutes"];
  resourceDiagnostics: readonly BestFitResourceDiagnostic[];
  copy: BestFitUiCopy;
  referencePlanAvailable: boolean;
}

function InfeasibleExplanation({
  taskId,
  taskName,
  excludedRoutes,
  resourceDiagnostics,
  copy,
  referencePlanAvailable,
}: InfeasibleExplanationProps) {
  const dialogId = useId();
  const titleId = `${dialogId}-title`;
  const introId = `${dialogId}-intro`;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pendingNavigationRef = useRef<
    { kind: "field"; targetId: string } | { kind: "route-details" } | null
  >(null);
  const reasons = [...new Set(excludedRoutes.flatMap(({ reasonCodes }) => reasonCodes))];
  const resourceIssues = resourceDiagnostics.flatMap((diagnostic) => {
    if (diagnostic.status !== "invalid") return [];
    const errorFields = Object.keys(
      diagnostic.fieldErrors,
    ) as AvailableAiResourceDraftField[];
    const orderedFields = [
      ...RESOURCE_FIELD_PRIORITY.filter((field) => errorFields.includes(field)),
      ...errorFields.filter((field) => !RESOURCE_FIELD_PRIORITY.includes(field)),
    ];
    const fields = [
      ...new Set(orderedFields.map((field) => resourceDraftFieldLabel(field, copy))),
    ];
    const targetId = orderedFields
      .map((field) => resourceDraftFieldTargetId(diagnostic.uiId, field))
      .find((candidate): candidate is string => candidate !== null);
    return fields.length > 0
      ? [{
          label: copy.results.infeasibleHelp.resourceIssue(
            diagnostic.displayName,
            fields.join(" · "),
          ),
          targetId: targetId ?? null,
        }]
      : [];
  });
  const firstResourceTarget = resourceIssues.find(
    (issue) => issue.targetId !== null,
  )?.targetId ?? null;
  const hasSystemEvidenceGap = reasons.some((reason) =>
    SYSTEM_EVIDENCE_REASONS.has(reason),
  );
  const hasTaskConstraint = reasons.some((reason) =>
    TASK_CONSTRAINT_REASONS.has(reason),
  );
  const mode = hasSystemEvidenceGap
    ? "system"
    : resourceIssues.length > 0
      ? "input"
      : hasTaskConstraint
        ? "task"
        : "generic";
  const modeTitle = mode === "system"
    ? copy.results.infeasibleHelp.systemProblemTitle
    : mode === "input"
      ? copy.results.infeasibleHelp.inputProblemTitle
      : mode === "task"
        ? copy.results.infeasibleHelp.taskProblemTitle
        : copy.results.infeasibleHelp.genericProblemTitle;
  const modeDescription = mode === "system"
    ? copy.results.infeasibleHelp.systemProblemDescription
    : mode === "input"
      ? copy.results.infeasibleHelp.inputProblemDescription
      : mode === "task"
        ? copy.results.infeasibleHelp.taskProblemDescription
        : copy.results.infeasibleHelp.genericProblemDescription;

  const closeDialog = () => dialogRef.current?.close();
  const closeAndNavigate = (
    target: { kind: "field"; targetId: string } | { kind: "route-details" },
  ) => {
    pendingNavigationRef.current = target;
    closeDialog();
  };
  const focusAfterClose = () => {
    const pendingNavigation = pendingNavigationRef.current;
    pendingNavigationRef.current = null;
    if (pendingNavigation === null) {
      triggerRef.current?.focus({ preventScroll: true });
      return;
    }
    requestAnimationFrame(() => {
      let target: HTMLElement | null = null;
      if (pendingNavigation.kind === "field") {
        target = document.getElementById(pendingNavigation.targetId);
        if (target?.tagName === "DETAILS") {
          const details = target as HTMLDetailsElement;
          details.open = true;
          target = details.querySelector<HTMLElement>("summary");
        }
      } else {
        const details = triggerRef.current
          ?.closest("article")
          ?.querySelector<HTMLDetailsElement>("details[data-excluded-routes]");
        if (details) {
          details.open = true;
          target = details.querySelector<HTMLElement>("summary");
        }
      }
      if (target === null || ("disabled" in target && target.disabled === true)) {
        triggerRef.current?.focus({ preventScroll: true });
        return;
      }
      const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      target.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "center",
      });
      target.focus({ preventScroll: true });
    });
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-controls={dialogId}
        onClick={() => dialogRef.current?.showModal()}
        className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl border border-[#a84e32]/20 bg-white px-3.5 py-2 text-sm font-bold text-[#8a3b25] transition hover:bg-[#fff8f4] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#cf6845]/15"
      >
        {copy.results.infeasibleHelp.open}
      </button>
      <dialog
        ref={dialogRef}
        id={dialogId}
        aria-labelledby={titleId}
        aria-describedby={introId}
        onCancel={(event) => {
          event.preventDefault();
          closeDialog();
        }}
        onClose={focusAfterClose}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeDialog();
        }}
        className="m-auto max-h-[min(84dvh,46rem)] w-[min(92vw,40rem)] overflow-y-auto rounded-[1.5rem] border border-[#173f31]/15 bg-white p-0 text-[#17352a] shadow-[0_28px_90px_rgba(17,42,31,0.3)] backdrop:bg-[#132e24]/40 backdrop:backdrop-blur-[2px]"
      >
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#b85331]">
                {copy.results.infeasibleHelp.reviewedRoutes(excludedRoutes.length)}
              </p>
              <h3
                id={titleId}
                className="mt-2 break-words text-xl font-semibold tracking-[-0.02em]"
              >
                {copy.results.infeasibleHelp.title(taskName)}
              </h3>
              <p id={introId} className="mt-2 text-sm leading-6 text-[#607067]">
                {copy.results.infeasibleHelp.intro}
              </p>
            </div>
            <button
              type="button"
              onClick={closeDialog}
              aria-label={copy.results.infeasibleHelp.close}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-[#173f31]/12 text-xl leading-none text-[#52645a] transition hover:bg-[#edf3ef] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2f6c55]/15"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>

          <section
            className={`mt-5 rounded-2xl border p-4 ${
              mode === "system"
                ? "border-[#2f6c55]/18 bg-[#f2f7f3]"
                : mode === "input"
                  ? "border-[#cf6845]/20 bg-[#fff2eb]"
                  : "border-[#c88743]/20 bg-[#fff9ef]"
            }`}
          >
            <h4 className="text-base font-bold text-[#294638]">{modeTitle}</h4>
            <p className="mt-2 text-sm leading-6 text-[#53645b]">
              {modeDescription}
            </p>
            {mode === "system" && referencePlanAvailable ? (
              <p className="mt-3 rounded-xl bg-white/75 px-3 py-2.5 text-sm font-bold leading-6 text-[#315b49]">
                {copy.results.infeasibleHelp.systemProblemStatus}
              </p>
            ) : null}
            {mode === "system" ? (
              <p className="mt-2 text-xs leading-5 text-[#68766e]">
                {copy.results.infeasibleHelp.accountStatusNotice}
              </p>
            ) : null}
            {mode === "system" && hasTaskConstraint ? (
              <p className="mt-2 text-xs leading-5 text-[#68766e]">
                {copy.results.infeasibleHelp.systemTaskConstraintNote}
              </p>
            ) : null}
          </section>

          {resourceIssues.length > 0 ? (
            <section className="mt-5 rounded-2xl border border-[#cf6845]/20 bg-[#fff2eb] p-4">
              <h4 className="text-sm font-bold text-[#7c331f]">
                {copy.results.infeasibleHelp.resourceIssuesTitle}
              </h4>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-6 text-[#743d2c]">
                {resourceIssues.map((issue) => <li key={issue.label}>{issue.label}</li>)}
              </ul>
              <p className="mt-2 text-xs leading-5 text-[#7a513d]">
                {copy.results.infeasibleHelp.inputProblemCaveat}
              </p>
              {mode !== "input" && firstResourceTarget !== null ? (
                <button
                  type="button"
                  onClick={() => closeAndNavigate({
                    kind: "field",
                    targetId: firstResourceTarget,
                  })}
                  className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl border border-[#a84e32]/20 bg-white px-3.5 py-2 text-sm font-bold text-[#8a3b25] transition hover:bg-[#fff8f4] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#cf6845]/15"
                >
                  {copy.results.infeasibleHelp.goToResourceInput}
                </button>
              ) : null}
            </section>
          ) : null}

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {mode === "system" && referencePlanAvailable ? (
              <button
                type="button"
                onClick={() => closeAndNavigate({
                  kind: "field",
                  targetId: "reference-api-plan",
                })}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#164a38] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#103d2e] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2f6c55]/20"
              >
                {copy.results.infeasibleHelp.viewReferencePlan}
              </button>
            ) : mode === "input" && firstResourceTarget !== null ? (
              <button
                type="button"
                onClick={() => closeAndNavigate({
                  kind: "field",
                  targetId: firstResourceTarget,
                })}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#164a38] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#103d2e] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2f6c55]/20"
              >
                {copy.results.infeasibleHelp.goToResourceInput}
              </button>
            ) : mode === "task" ? (
              <button
                type="button"
                onClick={() => closeAndNavigate({
                  kind: "field",
                  targetId: `task-description-${taskId}`,
                })}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#164a38] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#103d2e] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2f6c55]/20"
              >
                {copy.results.infeasibleHelp.reviewTaskInput}
              </button>
            ) : excludedRoutes.length > 0 ? (
              <button
                type="button"
                onClick={() => closeAndNavigate({ kind: "route-details" })}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#164a38] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#103d2e] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2f6c55]/20"
              >
                {copy.results.infeasibleHelp.showRouteDetails}
              </button>
            ) : null}
            <button
              type="button"
              onClick={closeDialog}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#173f31]/15 bg-white px-4 py-2.5 text-sm font-bold text-[#365649] transition hover:bg-[#edf3ef] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2f6c55]/20"
            >
              {copy.results.infeasibleHelp.close}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}

function sameRoute(left: RouteIdentity, right: RouteIdentity): boolean {
  return (
    left.providerId === right.providerId &&
    left.offeringId === right.offeringId &&
    left.resourceId === right.resourceId
  );
}

function routeLabel(
  route: RouteIdentity,
  resources: readonly BestFitResourceDiagnostic[],
  unknownLabel: string,
): string {
  const resource = resources.find(
    (item) => item.routeIdentity !== null && sameRoute(item.routeIdentity, route),
  );
  if (resource) {
    const providerName =
      route.providerId in PROVIDER_CATALOG
        ? PROVIDER_CATALOG[
            route.providerId as keyof typeof PROVIDER_CATALOG
          ].displayName
        : null;
    return providerName
      ? `${resource.displayName} · ${providerName}`
      : resource.displayName;
  }
  if (route.providerId in PROVIDER_CATALOG) {
    const provider = PROVIDER_CATALOG[
      route.providerId as keyof typeof PROVIDER_CATALOG
    ];
    const model = Object.values(provider.models).find(
      (candidate) =>
        route.offeringId ===
        `api.${provider.id}.${candidate.catalogId}.standard-text`,
    );
    return model
      ? `${provider.displayName} API · ${model.displayName}`
      : `${provider.displayName} API`;
  }
  return unknownLabel;
}

function scenarioCurrency(
  valueMicroUsd: number,
  numberLocale: string,
): string {
  return new Intl.NumberFormat(numberLocale, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(fromMicroUsd(valueMicroUsd));
}

function quotaValue(valueMicrounits: number, numberLocale: string): string {
  return new Intl.NumberFormat(numberLocale, {
    maximumFractionDigits: 6,
  }).format(valueMicrounits / 1_000_000);
}

export function BestFitResults({
  result,
  tasks,
  generatedAt,
  exportContext,
  referencePlanAvailable = false,
}: BestFitResultsProps) {
  const { locale, copy: coreCopy, localeMeta } = useLanguage();
  const copy = BEST_FIT_UI_COPY[locale];
  const { plan } = result;
  const formatMoney = (value: number) =>
    scenarioCurrency(value, localeMeta.numberLocale);
  const formatQuota = (value: number) =>
    quotaValue(value, localeMeta.numberLocale);
  const localizedReason = (reason: string) => {
    if (isBestFitExclusionReasonCode(reason)) {
      return copy.enums.exclusionReason[reason];
    }
    return copy.results.unknownExclusionReason;
  };
  const overflow = Object.values(plan.cash.scenarioOverflow).some(Boolean);
  const noCostedWork =
    plan.tasks.length > 0 && plan.infeasibleTaskCount === plan.tasks.length;
  const activeApiProviderIds = [
    ...new Set(
      plan.tasks.flatMap((task) =>
        task.status === "active" && task.routeKind === "api"
          ? [String(task.routeIdentity.providerId)]
          : [],
      ),
    ),
  ].filter(
    (providerId): providerId is keyof typeof PROVIDER_CATALOG =>
      providerId in PROVIDER_CATALOG,
  );

  return (
    <section className="rounded-[1.75rem] border border-[#173f31]/12 bg-white/95 p-5 shadow-[0_20px_60px_rgba(28,47,37,0.09)] sm:p-7">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#b85331]">
        {copy.results.eyebrow}
      </p>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.025em] text-[#17352a]">
            {copy.results.title}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#607067]">
            {copy.results.authorityNotice}
          </p>
        </div>
        <div className="min-w-0 space-y-3 sm:max-w-md sm:text-right">
          <div>
            <span className="inline-flex rounded-full bg-[#edf4ee] px-3.5 py-2 text-xs font-bold text-[#365649]">
              {copy.results.activeHeldInfeasible(
                plan.activeTaskCount,
                plan.heldTaskCount,
                plan.infeasibleTaskCount,
              )}
            </span>
          </div>
          <BestFitExportActions context={exportContext} />
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [copy.results.totalIncrementalCash, plan.cash.expectedMicroUsd],
          [copy.results.apiSpend, plan.cash.apiMicroUsd.expected],
          [copy.results.newCommitment, plan.cash.subscriptionFeeMicroUsd],
          [copy.results.paidOverage, plan.cash.paidOverageMicroUsd.expected],
        ].map(([label, value]) => (
          <div key={String(label)} className="min-w-0 rounded-2xl border border-[#173f31]/10 bg-[#f6f8f4] p-4">
            <p className="text-xs font-bold text-[#68766e]">{label}</p>
            <p className="mt-1 break-words font-mono text-xl font-bold text-[#173f31]">
              {formatMoney(value as number)}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className={`rounded-xl border px-4 py-3 text-sm ${noCostedWork ? "border-[#c88743]/25 bg-[#fff8ec] text-[#71491f]" : plan.expectedWithinBudget ? "border-[#2f6c55]/20 bg-[#edf5ef] text-[#274d3d]" : "border-[#cf6845]/25 bg-[#fff5ef] text-[#7c331f]"}`}>
          <span className="font-bold">{copy.results.expectedBudgetStatus}: </span>
          {noCostedWork
            ? copy.results.budgetNotAssessed
            : plan.expectedWithinBudget
              ? copy.results.withinBudget
              : copy.results.outsideBudget}
        </div>
        <div className={`rounded-xl border px-4 py-3 text-sm ${noCostedWork || plan.highExceedsBudget ? "border-[#c88743]/25 bg-[#fff8ec] text-[#71491f]" : "border-[#2f6c55]/20 bg-[#edf5ef] text-[#274d3d]"}`}>
          {noCostedWork
            ? copy.results.budgetNotAssessedDescription
            : plan.highExceedsBudget
              ? copy.results.highRisk
              : copy.results.noHighRisk}
        </div>
      </div>

      {activeApiProviderIds.length > 0 ? (
        <aside className="mt-3 rounded-xl border border-[#2f6c55]/18 bg-[#f2f7f3] px-4 py-3 text-sm leading-6 text-[#365649]">
          <p className="font-bold text-[#294638]">{copy.results.apiSetupTitle}</p>
          <p className="mt-1">{copy.results.apiSetupDescription}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {activeApiProviderIds.map((providerId) => {
              const providerName = PROVIDER_CATALOG[providerId].displayName;
              return (
                <a
                  key={providerId}
                  href={PROVIDER_API_SETUP_URLS[providerId]}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#2f6c55]/20 bg-white px-3.5 py-2 text-sm font-bold text-[#245440] transition hover:bg-[#eaf3ed] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2f6c55]/20"
                >
                  {copy.results.apiSetupLink(providerName)}
                  <span aria-hidden="true" className="ml-1.5">↗</span>
                </a>
              );
            })}
          </div>
          <p className="mt-2 text-xs leading-5 text-[#68766e]">
            {copy.results.apiSetupPrivacy}
          </p>
        </aside>
      ) : null}

      {plan.infeasibleTaskCount > 0 ? (
        <div
          role="alert"
          className="mt-3 rounded-xl border border-[#cf6845]/25 bg-[#fff2eb] px-4 py-3 text-sm leading-6 text-[#7c331f]"
        >
          <p className="font-bold">{copy.results.excludedCostNoticeTitle}</p>
          <p className="mt-0.5">
            {copy.results.excludedCostNotice(
              plan.infeasibleTaskCount,
              noCostedWork,
            )}
          </p>
        </div>
      ) : null}

      {plan.spendComparison ? (
        <div className="mt-3 rounded-xl border border-[#173f31]/10 bg-white px-4 py-3 text-sm leading-6 text-[#536159]">
          {plan.spendComparison.avoidedSpendMicroUsd > 0
            ? `${copy.results.avoidedSpend}: ${formatMoney(plan.spendComparison.avoidedSpendMicroUsd)}`
            : `${copy.results.additionalSpend}: ${formatMoney(plan.spendComparison.additionalSpendMicroUsd)}`}
        </div>
      ) : (
        <p className="mt-3 rounded-xl border border-[#173f31]/10 bg-white px-4 py-3 text-sm text-[#68766e]">
          {copy.results.noPremiumBaseline}
        </p>
      )}

      {overflow ? (
        <p role="alert" className="mt-3 rounded-xl border border-[#cf6845]/20 bg-[#fff5ef] px-4 py-3 text-sm text-[#7c331f]">
          {copy.results.scenarioOverflow}
        </p>
      ) : null}

      <div className="mt-7 space-y-4">
        {plan.tasks.map((taskResult, index) => {
          const task = tasks.find(({ id }) => id === taskResult.taskId);
          const candidateSet = result.candidateSets.find(
            ({ task: candidateTask }) => candidateTask.id === taskResult.taskId,
          );
          return (
            <article key={taskResult.taskId} className="min-w-0 rounded-2xl border border-[#173f31]/12 bg-[#fbfcf9] p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-[#7a877f]">
                    {copy.results.taskNumber(index + 1)}
                  </p>
                  <h3 className="mt-1 break-words text-lg font-semibold text-[#233d31]">
                    {task?.name ?? taskResult.taskId}
                  </h3>
                </div>
                <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${taskResult.status === "active" ? "bg-[#e5f1e8] text-[#2b5b44]" : taskResult.status === "held" ? "bg-[#fff0d6] text-[#7a4b18]" : "bg-[#fde9df] text-[#8a3b25]"}`}>
                  {taskResult.status === "infeasible"
                    ? candidateSet?.excludedRoutes.some(
                        ({ status }) => status === "conditional",
                      )
                      ? copy.results.needsVerificationStatus
                      : copy.results.requirementsUnmetStatus
                    : coreCopy.enums.allocationStatus[taskResult.status]}
                </span>
              </div>

              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-white p-3.5 sm:col-span-2">
                  <dt className="text-xs font-bold text-[#68766e]">{copy.results.accessRoute}</dt>
                  <dd className="mt-1 break-words text-sm font-bold text-[#294638]">
                    {taskResult.status === "active"
                      ? routeLabel(
                          taskResult.routeIdentity,
                          result.resourceDiagnostics,
                          copy.results.unknownRouteLabel,
                        )
                      : copy.results.noConfirmedRoute}
                  </dd>
                  {taskResult.status === "active" ? (
                    <dd className="mt-1 text-xs text-[#68766e]">
                      {copy.enums.routeKind[taskResult.routeKind]} · {copy.enums.planningTier[taskResult.qualityTier]}
                    </dd>
                  ) : null}
                </div>
                {taskResult.status === "active" ? (
                  <>
                    <div className="rounded-xl bg-white p-3.5">
                      <dt className="text-xs font-bold text-[#68766e]">{copy.results.model}</dt>
                      <dd className="mt-1 text-sm text-[#34443b]">{taskResult.modelId ?? coreCopy.common.none}</dd>
                    </div>
                    <div className="rounded-xl bg-white p-3.5">
                      <dt className="text-xs font-bold text-[#68766e]">
                        {taskResult.routeKind === "api"
                          ? copy.results.apiTaskPrice
                          : copy.results.subscriptionMarginalCash}
                      </dt>
                      <dd className="mt-1 font-mono text-sm font-bold text-[#34443b]">
                        {formatMoney(taskResult.variableCashMicroUsd.low)} / {formatMoney(taskResult.variableCashMicroUsd.expected)} / {formatMoney(taskResult.variableCashMicroUsd.high)}
                      </dd>
                      {taskResult.routeKind !== "api" ? (
                        <dd className="mt-2 text-xs leading-5 text-[#68766e]">
                          {copy.results.subscriptionMarginalCashNotice}
                        </dd>
                      ) : null}
                    </div>
                    <div className="rounded-xl bg-white p-3.5">
                      <dt className="text-xs font-bold text-[#68766e]">{copy.results.whyEnough}</dt>
                      <dd className="mt-1 text-sm leading-6 text-[#46564d]">{copy.enums.whyEnough[taskResult.whyEnough]}</dd>
                    </div>
                    <div className="rounded-xl bg-white p-3.5">
                      <dt className="text-xs font-bold text-[#68766e]">{copy.results.premiumChoice}</dt>
                      <dd className="mt-1 text-sm leading-6 text-[#46564d]">{copy.enums.whyNotPremium[taskResult.whyNotPremium]}</dd>
                    </div>
                    <div className="rounded-xl bg-white p-3.5">
                      <dt className="text-xs font-bold text-[#68766e]">{copy.results.upgradeTriggers}</dt>
                      <dd className="mt-1 text-sm leading-6 text-[#46564d]">
                        {taskResult.appliedUpgradeTriggers.length > 0
                          ? taskResult.appliedUpgradeTriggers.map((trigger) => copy.enums.upgradeTrigger[trigger]).join(" · ")
                          : coreCopy.common.none}
                      </dd>
                    </div>
                    <div className="rounded-xl bg-white p-3.5">
                      <dt className="text-xs font-bold text-[#68766e]">{copy.results.alternative}</dt>
                      <dd className="mt-1 break-words text-sm leading-6 text-[#46564d]">
                        {taskResult.alternativeRouteIdentity
                          ? routeLabel(
                              taskResult.alternativeRouteIdentity,
                              result.resourceDiagnostics,
                              copy.results.unknownRouteLabel,
                            )
                          : coreCopy.common.none}
                      </dd>
                    </div>
                  </>
                ) : taskResult.status === "held" ? (
                  <div className="rounded-xl bg-white p-3.5 sm:col-span-2">
                    <dt className="text-xs font-bold text-[#68766e]">{copy.results.holdReason}</dt>
                    <dd className="mt-1 text-sm leading-6 text-[#71491f]">{copy.results.holdReasonValue}</dd>
                  </div>
                ) : (
                  <div className="rounded-xl bg-white p-3.5 sm:col-span-2">
                    <dt className="text-xs font-bold text-[#68766e]">{copy.results.infeasibleReason}</dt>
                    <dd className="mt-1 text-sm leading-6 text-[#8a3b25]">{copy.results.infeasibleReasonValue}</dd>
                    <dd>
                      <InfeasibleExplanation
                        taskId={taskResult.taskId}
                        taskName={task?.name ?? taskResult.taskId}
                        excludedRoutes={candidateSet?.excludedRoutes ?? []}
                        resourceDiagnostics={result.resourceDiagnostics}
                        copy={copy}
                        referencePlanAvailable={referencePlanAvailable}
                      />
                    </dd>
                  </div>
                )}
              </dl>

              {taskResult.conditionalAlternatives.length > 0 ? (
                <div className="mt-4 rounded-xl border border-[#c88743]/20 bg-[#fff8ec] px-4 py-3">
                  <p className="text-sm font-bold text-[#71491f]">
                    {copy.results.conditionalAlternatives}
                  </p>
                  <ul className="mt-2 space-y-2">
                    {taskResult.conditionalAlternatives.map((alternative) => (
                      <li
                        key={`${JSON.stringify(alternative.routeIdentity)}:${JSON.stringify(alternative.fallbackRouteIdentity)}`}
                        className="break-words text-xs leading-5 text-[#6c5437]"
                      >
                        <span className="font-bold">
                          {routeLabel(
                            alternative.routeIdentity,
                            result.resourceDiagnostics,
                            copy.results.unknownRouteLabel,
                          )}
                        </span>
                        <span className="block">
                          {alternative.reasonCodes.map(localizedReason).join(" · ")}
                        </span>
                        <span className="block">
                          {copy.results.alternative}: {routeLabel(
                            alternative.fallbackRouteIdentity,
                            result.resourceDiagnostics,
                            copy.results.unknownRouteLabel,
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {candidateSet && candidateSet.excludedRoutes.length > 0 ? (
                <details
                  data-excluded-routes
                  className="mt-4 rounded-xl border border-[#173f31]/10 bg-white px-4 py-3"
                >
                  <summary className="cursor-pointer text-sm font-bold text-[#46564d]">
                    {copy.results.excludedRoutes} ({candidateSet.excludedRoutes.length})
                  </summary>
                  <ul className="mt-3 space-y-2">
                    {candidateSet.excludedRoutes.map((excluded) => (
                      <li key={JSON.stringify(excluded.routeIdentity)} className="break-words rounded-lg bg-[#f5f7f3] px-3 py-2 text-xs leading-5 text-[#5f6d65]">
                        <span className="font-bold">
                          {routeLabel(
                            excluded.routeIdentity,
                            result.resourceDiagnostics,
                            copy.results.unknownRouteLabel,
                          )}
                        </span>
                        <span className="mt-0.5 block">
                          {excluded.reasonCodes.map(localizedReason).join(" · ")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </article>
          );
        })}
      </div>

      <section className="mt-7 rounded-2xl border border-[#173f31]/10 bg-[#f6f8f4] p-4 sm:p-5">
        <h3 className="font-bold text-[#294638]">{copy.results.subscriptionUsage}</h3>
        {plan.subscriptionUsageLedgers.length === 0 ? (
          <p className="mt-2 text-sm text-[#68766e]">{copy.results.noSubscriptionUsage}</p>
        ) : (
          <ul className="mt-3 grid gap-3 lg:grid-cols-2">
            {plan.subscriptionUsageLedgers.map((ledger) => {
              const { low, expected, high } = ledger.scenarios;
              return (
                <li key={JSON.stringify(ledger.routeIdentity)} className="min-w-0 rounded-xl bg-white p-4 text-xs leading-5 text-[#536159]">
                  <p className="break-words font-bold text-[#294638]">
                    {routeLabel(
                      ledger.routeIdentity,
                      result.resourceDiagnostics,
                      copy.results.unknownRouteLabel,
                    )}
                  </p>
                  <p className="mt-1">{copy.results.usageUnit(copy.enums.quotaUnit[ledger.quotaUnit])}</p>
                  <p>{copy.results.usedRange(formatQuota(low.totalDemandMicrounits), formatQuota(expected.totalDemandMicrounits), formatQuota(high.totalDemandMicrounits))}</p>
                  <p>{copy.results.remainingRange(formatQuota(low.remainingIncludedMicrounits), formatQuota(expected.remainingIncludedMicrounits), formatQuota(high.remainingIncludedMicrounits))}</p>
                  <p>{copy.results.overageRange(formatQuota(low.overageUsedMicrounits), formatQuota(expected.overageUsedMicrounits), formatQuota(high.overageUsedMicrounits))}</p>
                  <p className="mt-1 font-mono">{copy.results.tasksUsingRoute(ledger.taskIds.join(", "))}</p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {result.resourceDiagnostics.length > 0 ? (
        <section className="mt-5 rounded-2xl border border-[#c88743]/20 bg-[#fffaf0] p-4 sm:p-5">
          <h3 className="font-bold text-[#71491f]">{copy.results.resourceDiagnostics}</h3>
          <ul className="mt-3 space-y-2">
            {result.resourceDiagnostics.map((diagnostic) => {
              const invalidFieldLabels = diagnostic.status === "invalid"
                ? [
                    ...new Set(
                      (Object.keys(
                        diagnostic.fieldErrors,
                      ) as AvailableAiResourceDraftField[]).map((field) =>
                        resourceDraftFieldLabel(field, copy),
                      ),
                    ),
                  ]
                : [];
              const usageSnapshot = diagnostic.usageSnapshot;
              const observedUsage = usageSnapshot
                ? SUBSCRIPTION_USAGE_PERCENT_KEYS.flatMap((metric) => {
                    const percent = usageSnapshot[metric];
                    return percent === undefined ? [] : [{ metric, percent }];
                  })
                : [];
              const usageBottleneck = usageSnapshot
                ? subscriptionUsageBottleneckPercent(usageSnapshot)
                : null;
              return (
              <li key={diagnostic.uiId} className="rounded-xl bg-white/75 px-3.5 py-3 text-xs leading-5 text-[#6c5437]">
                <span className="font-bold">{diagnostic.displayName}</span>
                <span className="ml-2 rounded-full bg-[#fff0d6] px-2 py-1 font-bold">
                  {diagnostic.status === "invalid"
                    ? copy.resources.invalidStatus
                    : diagnostic.status === "conditional"
                      ? copy.resources.conditionalStatus
                      : coreCopy.common.active}
                </span>
                {diagnostic.status === "invalid" ? (
                  <div className="mt-1">
                    <p className="font-bold">{copy.resources.fieldsToCheck}</p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-5">
                      {invalidFieldLabels.map((label) => (
                        <li key={label}>{label}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <span className="mt-1 block">
                    {diagnostic.reasonCodes.map(localizedReason).join(" · ") ||
                      copy.resources.conditionalNotice}
                  </span>
                )}
                {observedUsage.length > 0 && usageSnapshot ? (
                  <div className="mt-3 rounded-xl border border-[#2f6c55]/15 bg-[#edf5ef] p-3 text-[#365649]">
                    <p className="font-bold text-[#294638]">
                      {copy.results.recordedUsageTitle}
                    </p>
                    <ul className="mt-1.5 flex flex-wrap gap-1.5">
                      {observedUsage.map(({ metric, percent }) => {
                        const model = metric === "modelWeeklyRemainingPercent" &&
                          usageSnapshot.modelLabel
                          ? ` (${usageSnapshot.modelLabel})`
                          : "";
                        return (
                          <li
                            key={metric}
                            className="min-w-0 max-w-full rounded-full bg-white px-2.5 py-1 font-bold text-[#365649] [overflow-wrap:anywhere]"
                          >
                            {copy.resources.usageSnapshot.metricLabels[metric]}
                            {model}: {copy.resources.usageSnapshot.remaining(percent)}
                          </li>
                        );
                      })}
                    </ul>
                    {usageBottleneck !== null ? (
                      <p className="mt-2 font-bold text-[#294638]">
                        {copy.resources.usageSnapshot.bottleneck(usageBottleneck)}
                      </p>
                    ) : null}
                    <p className="mt-1.5 leading-5">
                      {copy.results.recordedUsageReferenceOnly}
                    </p>
                  </div>
                ) : null}
              </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <p className="mt-5 text-xs text-[#7a877f]">
        {copy.results.generatedAt(
          new Date(generatedAt).toLocaleString(localeMeta.dateLocale),
        )}
      </p>
    </section>
  );
}
