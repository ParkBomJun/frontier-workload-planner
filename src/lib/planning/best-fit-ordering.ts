import type {
  PlanningStrategy,
  TaskPriority,
} from "@/types/domain";
import type {
  CanonicalRouteKey,
  RouteIdentity,
  SubscriptionRouteIdentity,
} from "@/types/offerings";
import type {
  FailureImpact,
  FailureRisk,
  PlanningQualityTier,
} from "@/types/workload";

import {
  assertUniqueRouteIdentities,
  compareCanonicalRouteKeys,
  compareRouteIdentities,
  routeIdentityToCanonicalKey,
} from "@/lib/offerings/route-identity";

export const BEST_FIT_ROUTE_KINDS = [
  "owned-within-included-quota",
  "api",
  "owned-paid-overage",
  "new-subscription",
] as const;

export const BEST_FIT_PLAN_STATUSES = [
  "active",
  "held",
  "infeasible",
] as const;

export type BestFitRouteKind = (typeof BEST_FIT_ROUTE_KINDS)[number];
export type BestFitPlanStatus = (typeof BEST_FIT_PLAN_STATUSES)[number];
export type QualityKey = readonly [shortfall: number, excess: number];

export interface BestFitTaskOrderInput {
  taskId: string;
  priority: TaskPriority;
  deadlineDate: string | null;
  failureImpact: FailureImpact;
  failureRisk: FailureRisk;
  originalIndex: number;
}

export interface BestFitRouteOrderingCandidate {
  routeIdentity: RouteIdentity;
  qualityTier: PlanningQualityTier;
  routeKind: BestFitRouteKind;
  expectedVariableCashMicroUsd: number;
}

export interface BestFitPlanTaskOrderingCandidate
  extends BestFitTaskOrderInput {
  status: BestFitPlanStatus;
  targetQualityTier: PlanningQualityTier;
  route: BestFitRouteOrderingCandidate | null;
}

export interface BestFitPlanOrderingCandidate {
  expectedWithinBudget: boolean;
  expectedIncrementalCashMicroUsd: number;
  highIncrementalCashMicroUsd: number;
  exactIncrementalCashMicroUsd?: {
    expected: bigint;
    high: bigint;
  };
  tasks: readonly BestFitPlanTaskOrderingCandidate[];
  activatedSubscriptionRoutes: readonly SubscriptionRouteIdentity[];
}

const PRIORITY_RESERVATION_RANK: Readonly<Record<TaskPriority, number>> = {
  high: 0,
  medium: 1,
  low: 2,
};

const PRIORITY_RELIEF_RANK: Readonly<Record<TaskPriority, number>> = {
  low: 0,
  medium: 1,
  high: 2,
};

const IMPACT_RESERVATION_RANK: Readonly<Record<FailureImpact, number>> = {
  high: 0,
  medium: 1,
  low: 2,
  unspecified: 3,
};

const IMPACT_RELIEF_RANK: Readonly<Record<FailureImpact, number>> = {
  unspecified: 0,
  low: 1,
  medium: 2,
  high: 3,
};

const RISK_RESERVATION_RANK: Readonly<Record<FailureRisk, number>> = {
  high: 0,
  medium: 1,
  low: 2,
};

const RISK_RELIEF_RANK: Readonly<Record<FailureRisk, number>> = {
  low: 0,
  medium: 1,
  high: 2,
};

const TIER_RANK: Readonly<Record<PlanningQualityTier, number>> = {
  economy: 0,
  balanced: 1,
  premium: 2,
};

const ROUTE_KIND_RANK: Readonly<Record<BestFitRouteKind, number>> = {
  "owned-within-included-quota": 0,
  api: 1,
  "owned-paid-overage": 2,
  "new-subscription": 3,
};

const STATUS_RANK: Readonly<Record<BestFitPlanStatus, number>> = {
  active: 0,
  held: 1,
  infeasible: 2,
};

const TASK_PRIORITIES = ["high", "medium", "low"] as const;
const FAILURE_IMPACTS = ["high", "medium", "low", "unspecified"] as const;
const FAILURE_RISKS = ["high", "medium", "low"] as const;
const QUALITY_TIERS = ["economy", "balanced", "premium"] as const;
const STRATEGIES = ["cost-saver", "balanced", "quality-first"] as const;
const STABLE_ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;

function assertEnumValue<T extends string>(
  value: unknown,
  values: readonly T[],
  label: string,
): asserts value is T {
  if (typeof value !== "string" || !(values as readonly string[]).includes(value)) {
    throw new Error(`${label} is not a supported value.`);
  }
}

function assertSafeCash(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative safe micro-USD integer.`);
  }
}

function assertStableId(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !STABLE_ID_PATTERN.test(value)) {
    throw new Error(`${label} must be a lowercase ASCII stable ID.`);
  }
}

function isIsoCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match === null) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12) return false;
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [
    31,
    leapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  return day >= 1 && day <= daysInMonth[month - 1];
}

function assertTaskOrderInput(value: BestFitTaskOrderInput): void {
  if (typeof value !== "object" || value === null) {
    throw new Error("Best-fit task ordering input must be an object.");
  }
  if (typeof value.taskId !== "string" || value.taskId.trim().length === 0) {
    throw new Error("Task ID must be a non-empty string.");
  }
  assertEnumValue(value.priority, TASK_PRIORITIES, "Task priority");
  assertEnumValue(value.failureImpact, FAILURE_IMPACTS, "Failure impact");
  assertEnumValue(value.failureRisk, FAILURE_RISKS, "Failure risk");
  if (
    value.deadlineDate !== null &&
    (typeof value.deadlineDate !== "string" ||
      !isIsoCalendarDate(value.deadlineDate))
  ) {
    throw new Error("Task deadline must be null or a valid YYYY-MM-DD date.");
  }
  if (!Number.isSafeInteger(value.originalIndex) || value.originalIndex < 0) {
    throw new Error("Original task index must be a non-negative safe integer.");
  }
}

function assertRouteIdentity(identity: RouteIdentity): void {
  if (typeof identity !== "object" || identity === null) {
    throw new Error("Route identity must be an object.");
  }
  assertStableId(identity.providerId, "Route provider ID");
  assertStableId(identity.offeringId, "Route Offering ID");
  if (identity.resourceId !== null) {
    assertStableId(identity.resourceId, "Route resource ID");
  }
}

function assertStrategy(strategy: PlanningStrategy): void {
  assertEnumValue(strategy, STRATEGIES, "Planning strategy");
}

function assertQualityTier(tier: PlanningQualityTier, label: string): void {
  assertEnumValue(tier, QUALITY_TIERS, label);
}

function assertRouteCandidate(candidate: BestFitRouteOrderingCandidate): void {
  if (typeof candidate !== "object" || candidate === null) {
    throw new Error("Best-fit route candidate must be an object.");
  }
  assertRouteIdentity(candidate.routeIdentity);
  assertQualityTier(candidate.qualityTier, "Route quality tier");
  assertEnumValue(candidate.routeKind, BEST_FIT_ROUTE_KINDS, "Route kind");
  assertSafeCash(
    candidate.expectedVariableCashMicroUsd,
    "Expected variable route cash",
  );
  const isApiIdentity = candidate.routeIdentity.resourceId === null;
  if ((candidate.routeKind === "api") !== isApiIdentity) {
    throw new Error("API route kind and route resource identity must agree.");
  }
}

function compareNumbers(left: number, right: number): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareNullableDeadlinesForReservation(
  left: string | null,
  right: string | null,
): number {
  if (left === right) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return left < right ? -1 : 1;
}

function compareNullableDeadlinesForRelief(
  left: string | null,
  right: string | null,
): number {
  if (left === right) return 0;
  if (left === null) return -1;
  if (right === null) return 1;
  return left > right ? -1 : 1;
}

export function compareBestFitReservationOrder(
  left: BestFitTaskOrderInput,
  right: BestFitTaskOrderInput,
): number {
  assertTaskOrderInput(left);
  assertTaskOrderInput(right);
  return (
    compareNumbers(
      PRIORITY_RESERVATION_RANK[left.priority],
      PRIORITY_RESERVATION_RANK[right.priority],
    ) ||
    compareNullableDeadlinesForReservation(
      left.deadlineDate,
      right.deadlineDate,
    ) ||
    compareNumbers(
      IMPACT_RESERVATION_RANK[left.failureImpact],
      IMPACT_RESERVATION_RANK[right.failureImpact],
    ) ||
    compareNumbers(
      RISK_RESERVATION_RANK[left.failureRisk],
      RISK_RESERVATION_RANK[right.failureRisk],
    ) ||
    compareNumbers(left.originalIndex, right.originalIndex)
  );
}

export function compareBestFitReliefOrder(
  left: BestFitTaskOrderInput,
  right: BestFitTaskOrderInput,
): number {
  assertTaskOrderInput(left);
  assertTaskOrderInput(right);
  return (
    compareNumbers(
      PRIORITY_RELIEF_RANK[left.priority],
      PRIORITY_RELIEF_RANK[right.priority],
    ) ||
    compareNullableDeadlinesForRelief(left.deadlineDate, right.deadlineDate) ||
    compareNumbers(
      IMPACT_RELIEF_RANK[left.failureImpact],
      IMPACT_RELIEF_RANK[right.failureImpact],
    ) ||
    compareNumbers(
      RISK_RELIEF_RANK[left.failureRisk],
      RISK_RELIEF_RANK[right.failureRisk],
    ) ||
    compareNumbers(left.originalIndex, right.originalIndex)
  );
}

function assertUniqueTasks(tasks: readonly BestFitTaskOrderInput[]): void {
  const taskIds = new Set<string>();
  const originalIndexes = new Set<number>();
  for (const task of tasks) {
    assertTaskOrderInput(task);
    if (taskIds.has(task.taskId) || originalIndexes.has(task.originalIndex)) {
      throw new Error("Best-fit task IDs and original indexes must be unique.");
    }
    taskIds.add(task.taskId);
    originalIndexes.add(task.originalIndex);
  }
}

export function sortBestFitReservationOrder<T extends BestFitTaskOrderInput>(
  tasks: readonly T[],
): T[] {
  assertUniqueTasks(tasks);
  return [...tasks].sort(compareBestFitReservationOrder);
}

export function sortBestFitReliefOrder<T extends BestFitTaskOrderInput>(
  tasks: readonly T[],
): T[] {
  assertUniqueTasks(tasks);
  return [...tasks].sort(compareBestFitReliefOrder);
}

export function tierRank(tier: PlanningQualityTier): number {
  assertQualityTier(tier, "Planning quality tier");
  return TIER_RANK[tier];
}

export function qualityKey(
  routeTier: PlanningQualityTier,
  targetTier: PlanningQualityTier,
): QualityKey {
  const route = tierRank(routeTier);
  const target = tierRank(targetTier);
  return Object.freeze([
    Math.max(0, target - route),
    Math.max(0, route - target),
  ]) as QualityKey;
}

function compareNumberVectors(
  left: readonly number[],
  right: readonly number[],
): number {
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    if (left[index] === undefined) return -1;
    if (right[index] === undefined) return 1;
    const difference = compareNumbers(left[index], right[index]);
    if (difference !== 0) return difference;
  }
  return 0;
}

function compareQualityKeys(left: QualityKey, right: QualityKey): number {
  return compareNumberVectors(left, right);
}

function capacityCashClassRank(routeKind: BestFitRouteKind): number {
  return routeKind === "owned-within-included-quota" ? 0 : 1;
}

export function compareBestFitRoutes(
  left: BestFitRouteOrderingCandidate,
  right: BestFitRouteOrderingCandidate,
  strategy: PlanningStrategy,
  targetTier: PlanningQualityTier,
): number {
  assertRouteCandidate(left);
  assertRouteCandidate(right);
  assertStrategy(strategy);
  assertQualityTier(targetTier, "Target quality tier");

  const leftQuality = qualityKey(left.qualityTier, targetTier);
  const rightQuality = qualityKey(right.qualityTier, targetTier);
  if (strategy === "cost-saver") {
    return (
      compareNumbers(
        left.expectedVariableCashMicroUsd,
        right.expectedVariableCashMicroUsd,
      ) ||
      compareQualityKeys(leftQuality, rightQuality) ||
      compareNumbers(
        ROUTE_KIND_RANK[left.routeKind],
        ROUTE_KIND_RANK[right.routeKind],
      ) ||
      compareRouteIdentities(left.routeIdentity, right.routeIdentity)
    );
  }

  return (
    compareQualityKeys(leftQuality, rightQuality) ||
    compareNumbers(
      capacityCashClassRank(left.routeKind),
      capacityCashClassRank(right.routeKind),
    ) ||
    compareNumbers(
      left.expectedVariableCashMicroUsd,
      right.expectedVariableCashMicroUsd,
    ) ||
    compareNumbers(
      ROUTE_KIND_RANK[left.routeKind],
      ROUTE_KIND_RANK[right.routeKind],
    ) ||
    compareRouteIdentities(left.routeIdentity, right.routeIdentity)
  );
}

export function sortBestFitRoutes<T extends BestFitRouteOrderingCandidate>(
  candidates: readonly T[],
  strategy: PlanningStrategy,
  targetTier: PlanningQualityTier,
): T[] {
  assertStrategy(strategy);
  assertQualityTier(targetTier, "Target quality tier");
  candidates.forEach(assertRouteCandidate);
  assertUniqueRouteIdentities(candidates.map(({ routeIdentity }) => routeIdentity));
  return [...candidates].sort((left, right) =>
    compareBestFitRoutes(left, right, strategy, targetTier),
  );
}

function assertPlanTask(task: BestFitPlanTaskOrderingCandidate): void {
  assertTaskOrderInput(task);
  assertEnumValue(task.status, BEST_FIT_PLAN_STATUSES, "Plan task status");
  assertQualityTier(task.targetQualityTier, "Task target quality tier");
  if (task.status === "active") {
    if (task.route === null) {
      throw new Error("An active Best-fit task requires a route.");
    }
    assertRouteCandidate(task.route);
    return;
  }
  if (task.route !== null) {
    throw new Error("Held and infeasible Best-fit tasks cannot carry a route.");
  }
}

function normalizedPlanTasks(
  plan: BestFitPlanOrderingCandidate,
): {
  reservation: BestFitPlanTaskOrderingCandidate[];
  original: BestFitPlanTaskOrderingCandidate[];
} {
  if (typeof plan !== "object" || plan === null) {
    throw new Error("Best-fit plan candidate must be an object.");
  }
  if (typeof plan.expectedWithinBudget !== "boolean") {
    throw new Error("Best-fit plan budget fit must be boolean.");
  }
  assertSafeCash(
    plan.expectedIncrementalCashMicroUsd,
    "Expected plan incremental cash",
  );
  assertSafeCash(
    plan.highIncrementalCashMicroUsd,
    "High plan incremental cash",
  );
  if (
    plan.exactIncrementalCashMicroUsd !== undefined &&
    (typeof plan.exactIncrementalCashMicroUsd.expected !== "bigint" ||
      plan.exactIncrementalCashMicroUsd.expected < BigInt(0) ||
      typeof plan.exactIncrementalCashMicroUsd.high !== "bigint" ||
      plan.exactIncrementalCashMicroUsd.high < BigInt(0))
  ) {
    throw new Error("Exact plan cash keys must be non-negative BigInt values.");
  }
  plan.tasks.forEach(assertPlanTask);
  assertUniqueTasks(plan.tasks);
  plan.activatedSubscriptionRoutes.forEach((route) => {
    assertRouteIdentity(route);
    if (route.resourceId === null) {
      throw new Error("An activated subscription route needs a resource ID.");
    }
  });
  assertUniqueRouteIdentities(plan.activatedSubscriptionRoutes);
  return {
    reservation: [...plan.tasks].sort(compareBestFitReservationOrder),
    original: [...plan.tasks].sort((left, right) =>
      compareNumbers(left.originalIndex, right.originalIndex),
    ),
  };
}

function assertSameTaskUniverse(
  left: readonly BestFitPlanTaskOrderingCandidate[],
  right: readonly BestFitPlanTaskOrderingCandidate[],
): void {
  if (left.length !== right.length) {
    throw new Error("Best-fit plans must cover the same task universe.");
  }
  for (let index = 0; index < left.length; index += 1) {
    const a = left[index];
    const b = right[index];
    if (
      a.taskId !== b.taskId ||
      a.originalIndex !== b.originalIndex ||
      a.priority !== b.priority ||
      a.deadlineDate !== b.deadlineDate ||
      a.failureImpact !== b.failureImpact ||
      a.failureRisk !== b.failureRisk ||
      a.targetQualityTier !== b.targetQualityTier
    ) {
      throw new Error("Best-fit plans must use the same immutable task ordering facts.");
    }
  }
}

function compareStatusVectors(
  left: readonly BestFitPlanTaskOrderingCandidate[],
  right: readonly BestFitPlanTaskOrderingCandidate[],
): number {
  return compareNumberVectors(
    left.map(({ status }) => STATUS_RANK[status]),
    right.map(({ status }) => STATUS_RANK[status]),
  );
}

function qualityVector(
  tasks: readonly BestFitPlanTaskOrderingCandidate[],
): number[] {
  return tasks.flatMap((task) =>
    task.status === "active" && task.route !== null
      ? [...qualityKey(task.route.qualityTier, task.targetQualityTier)]
      : [0, 0],
  );
}

function capacityVector(
  tasks: readonly BestFitPlanTaskOrderingCandidate[],
): number[] {
  return tasks.map((task) =>
    task.status === "active" && task.route !== null
      ? capacityCashClassRank(task.route.routeKind)
      : 0,
  );
}

function sortedActivatedKeys(
  routes: readonly SubscriptionRouteIdentity[],
): CanonicalRouteKey[] {
  return routes
    .map(routeIdentityToCanonicalKey)
    .sort(compareCanonicalRouteKeys);
}

function compareCanonicalKeyVectors(
  left: readonly CanonicalRouteKey[],
  right: readonly CanonicalRouteKey[],
): number {
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    if (left[index] === undefined) return -1;
    if (right[index] === undefined) return 1;
    const difference = compareCanonicalRouteKeys(left[index], right[index]);
    if (difference !== 0) return difference;
  }
  return 0;
}

function compareAssignmentVectors(
  left: readonly BestFitPlanTaskOrderingCandidate[],
  right: readonly BestFitPlanTaskOrderingCandidate[],
): number {
  for (let index = 0; index < left.length; index += 1) {
    const leftRoute = left[index].route?.routeIdentity ?? null;
    const rightRoute = right[index].route?.routeIdentity ?? null;
    if (leftRoute === null && rightRoute === null) continue;
    if (leftRoute === null) return -1;
    if (rightRoute === null) return 1;
    const difference = compareRouteIdentities(leftRoute, rightRoute);
    if (difference !== 0) return difference;
  }
  return 0;
}

function comparePlanCash(
  left: BestFitPlanOrderingCandidate,
  right: BestFitPlanOrderingCandidate,
  scenario: "expected" | "high",
): number {
  const leftExact = left.exactIncrementalCashMicroUsd;
  const rightExact = right.exactIncrementalCashMicroUsd;
  if ((leftExact === undefined) !== (rightExact === undefined)) {
    throw new Error("Compared Best-fit plans must use the same exact-cash contract.");
  }
  if (leftExact !== undefined && rightExact !== undefined) {
    return leftExact[scenario] < rightExact[scenario]
      ? -1
      : leftExact[scenario] > rightExact[scenario]
        ? 1
        : 0;
  }
  return compareNumbers(
    scenario === "expected"
      ? left.expectedIncrementalCashMicroUsd
      : left.highIncrementalCashMicroUsd,
    scenario === "expected"
      ? right.expectedIncrementalCashMicroUsd
      : right.highIncrementalCashMicroUsd,
  );
}

export function compareBestFitPlans(
  left: BestFitPlanOrderingCandidate,
  right: BestFitPlanOrderingCandidate,
  strategy: PlanningStrategy,
): number {
  assertStrategy(strategy);
  const normalizedLeft = normalizedPlanTasks(left);
  const normalizedRight = normalizedPlanTasks(right);
  assertSameTaskUniverse(normalizedLeft.original, normalizedRight.original);

  const commonPrefix =
    compareNumbers(left.expectedWithinBudget ? 0 : 1, right.expectedWithinBudget ? 0 : 1) ||
    compareStatusVectors(
      normalizedLeft.reservation,
      normalizedRight.reservation,
    );
  if (commonPrefix !== 0) return commonPrefix;

  const leftQuality = qualityVector(normalizedLeft.reservation);
  const rightQuality = qualityVector(normalizedRight.reservation);
  const leftCapacity = capacityVector(normalizedLeft.reservation);
  const rightCapacity = capacityVector(normalizedRight.reservation);
  const strategyDifference =
    strategy === "cost-saver"
      ? comparePlanCash(left, right, "expected") ||
        comparePlanCash(left, right, "high") ||
        compareNumberVectors(leftQuality, rightQuality)
      : compareNumberVectors(leftQuality, rightQuality) ||
        compareNumberVectors(leftCapacity, rightCapacity) ||
        comparePlanCash(left, right, "expected") ||
        comparePlanCash(left, right, "high");
  if (strategyDifference !== 0) return strategyDifference;

  return (
    compareCanonicalKeyVectors(
      sortedActivatedKeys(left.activatedSubscriptionRoutes),
      sortedActivatedKeys(right.activatedSubscriptionRoutes),
    ) ||
    compareAssignmentVectors(normalizedLeft.original, normalizedRight.original)
  );
}

export function sortBestFitPlans<T extends BestFitPlanOrderingCandidate>(
  plans: readonly T[],
  strategy: PlanningStrategy,
): T[] {
  assertStrategy(strategy);
  const normalized = plans.map(normalizedPlanTasks);
  if (normalized.length > 0) {
    normalized.slice(1).forEach((candidate) =>
      assertSameTaskUniverse(normalized[0].original, candidate.original),
    );
  }
  return [...plans].sort((left, right) =>
    compareBestFitPlans(left, right, strategy),
  );
}
