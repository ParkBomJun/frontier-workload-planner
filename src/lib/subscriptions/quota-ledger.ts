import {
  assertUniqueRouteIdentities,
  compareRouteIdentities,
  normalizeConditionalReasonCodes,
} from "@/lib/offerings/route-identity";
import type { SubscriptionRouteIdentity } from "@/types/offerings";
import type {
  ConditionalSubscriptionQuotaReservation,
  DerivedSubscriptionQuotaLedger,
  NumericDerivedQuotaLedger,
  QuotaDemandResult,
  QuotaDemandInput,
  QuotaReservationResult,
  ConfirmedSubscriptionQuotaReservation,
  ResolvedSubscriptionResource,
} from "@/types/subscriptions";
import { z } from "zod";

import { resolvePaidOverage } from "./overage-resolver";
import {
  isIssuedQuotaDemandResultFor,
  issuedQuotaDemandMicrounitsFor,
} from "./quota-demand";
import {
  fromSubscriptionQuotaMicrounits,
  toSourceSubscriptionMicrounits,
} from "./fixed-decimal";
import {
  isResolverIssuedSubscriptionResource,
  isResolverIssuedSubscriptionResourceForPlanningAsOf,
} from "./resource-resolver";

const issuedLedgers = new WeakSet<object>();
const ledgerResources = new WeakMap<object, ResolvedSubscriptionResource>();

export interface ReserveSubscriptionQuotaInput {
  resource: ResolvedSubscriptionResource;
  ledger: DerivedSubscriptionQuotaLedger;
  taskId: string;
  analysis: QuotaDemandInput["analysis"];
  demand: QuotaDemandResult;
  planningAsOf: string;
}

export interface SubscriptionLedgerCandidate {
  resource: ResolvedSubscriptionResource;
  ledger: DerivedSubscriptionQuotaLedger;
  routeIdentity: SubscriptionRouteIdentity;
  demand: QuotaDemandResult;
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  Object.values(value).forEach((child) => deepFreeze(child));
  return Object.freeze(value);
}

function sameRoute(
  left: SubscriptionRouteIdentity,
  right: SubscriptionRouteIdentity,
): boolean {
  return (
    left.providerId === right.providerId &&
    left.offeringId === right.offeringId &&
    left.resourceId === right.resourceId
  );
}

function routeMatchesResource(
  route: SubscriptionRouteIdentity,
  resource: ResolvedSubscriptionResource,
): boolean {
  return (
    route.providerId === resource.offeringRef.providerId &&
    route.offeringId === resource.offeringRef.offeringId &&
    route.resourceId === resource.id
  );
}

function quotaAvailableUnits(resource: ResolvedSubscriptionResource): number | null {
  if (resource.quota.kind === "metered") return resource.quota.remaining.value;
  if (resource.quota.kind === "calibrated") {
    return resource.quota.remainingPercent.value;
  }
  if (resource.quota.kind === "initial-capacity") {
    return resource.quota.availableOnActivation.value;
  }
  return null;
}

function quotaUnit(resource: ResolvedSubscriptionResource) {
  return resource.quota.kind === "opaque" ? null : resource.quota.unit;
}

function isDuplicate(
  ledger: DerivedSubscriptionQuotaLedger,
  taskId: string,
): boolean {
  return ledger.kind === "opaque"
    ? ledger.suggestedTaskIds.includes(taskId)
    : ledger.reservations.some(
        (reservation) =>
          reservation.taskId === taskId &&
          sameRoute(reservation.routeIdentity, ledger.routeIdentity),
      );
}

function issueLedger<T extends DerivedSubscriptionQuotaLedger>(
  ledger: T,
  resource: ResolvedSubscriptionResource,
): T {
  const frozen = deepFreeze(ledger);
  issuedLedgers.add(frozen);
  ledgerResources.set(frozen, resource);
  return frozen;
}

export function isDerivedSubscriptionQuotaLedger(
  value: unknown,
): value is DerivedSubscriptionQuotaLedger {
  return typeof value === "object" && value !== null && issuedLedgers.has(value);
}

export function createDerivedSubscriptionQuotaLedger(
  resource: ResolvedSubscriptionResource,
  routeIdentity: SubscriptionRouteIdentity,
  planningAsOf: string,
): DerivedSubscriptionQuotaLedger {
  if (!isResolverIssuedSubscriptionResourceForPlanningAsOf(resource, planningAsOf)) {
    throw new Error("A quota ledger requires a resolver-issued subscription resource.");
  }
  if (!routeMatchesResource(routeIdentity, resource)) {
    throw new Error("Quota ledger route identity must match its subscription resource.");
  }
  if (resource.quota.kind === "opaque") {
    return issueLedger({
      kind: "opaque",
      routeIdentity: { ...routeIdentity },
      planningAsOf,
      suggestedTaskIds: [],
      description: resource.quota.description,
    }, resource);
  }
  const availableUnits = quotaAvailableUnits(resource);
  if (availableUnits === null) {
    throw new Error("Numeric subscription quota must expose available units.");
  }
  if (!Number.isFinite(availableUnits) || availableUnits < 0) {
    throw new Error("Resolved subscription quota must be finite and non-negative.");
  }
  const availableMicrounits = toSourceSubscriptionMicrounits(availableUnits);
  if (availableMicrounits === null) {
    throw new Error("Resolved subscription quota exceeds fixed-decimal bounds.");
  }
  return issueLedger({
    kind: "numeric",
    routeIdentity: { ...routeIdentity },
    planningAsOf,
    unit: resource.quota.unit,
    sourceAvailableUnits: availableUnits,
    remainingUnits: availableUnits,
    sourceAvailableMicrounits: availableMicrounits,
    remainingMicrounits: availableMicrounits,
    overageUnitsUsed: 0,
    overageMicrounitsUsed: 0,
    overageCostMicroUsd: 0,
    reservations: [],
  }, resource);
}

function conditionalReasonForDemand(
  demand: Extract<QuotaDemandResult, { status: "unknown" }>,
) {
  return demand.reasonCode === "quota-opaque"
    ? "quota-opaque" as const
    : "profile-unverified" as const;
}

export function reserveSubscriptionQuota(
  input: ReserveSubscriptionQuotaInput,
): QuotaReservationResult {
  const { resource, ledger, taskId, analysis, demand } = input;
  if (
    !isResolverIssuedSubscriptionResource(resource) ||
    !isResolverIssuedSubscriptionResourceForPlanningAsOf(
      resource,
      input.planningAsOf,
    ) ||
    !isDerivedSubscriptionQuotaLedger(ledger) ||
    ledgerResources.get(ledger) !== resource ||
    !routeMatchesResource(ledger.routeIdentity, resource) ||
    ledger.planningAsOf !== input.planningAsOf ||
    !isIssuedQuotaDemandResultFor(demand, resource.quota, analysis, {
      providerId: resource.offeringRef.providerId,
      subjectId: resource.id,
    }) ||
    typeof taskId !== "string" ||
    taskId.length === 0 ||
    analysis.taskId !== taskId ||
    !z.iso.datetime().safeParse(input.planningAsOf).success
  ) {
    throw new Error("Quota reservation requires resolved matching source state.");
  }
  if (isDuplicate(ledger, taskId)) {
    return { status: "unavailable", ledger, reasonCode: "duplicate-task-reservation" };
  }
  if (resource.availability.status === "unavailable") {
    return { status: "unavailable", ledger, reasonCode: "resource-unavailable" };
  }

  if (ledger.kind === "opaque") {
    const nextLedger = issueLedger({
      ...ledger,
      suggestedTaskIds: [...ledger.suggestedTaskIds, taskId],
    }, resource);
    return {
      status: "conditional",
      ledger: nextLedger,
      reservation: null,
      reasonCodes: normalizeConditionalReasonCodes([
        ...(resource.availability.status === "uncertain"
          ? ["availability-uncertain" as const]
          : []),
        "quota-opaque",
      ]),
    };
  }
  if (demand.status === "unknown") {
    return {
      status: "conditional",
      ledger,
      reservation: null,
      reasonCodes: normalizeConditionalReasonCodes([
        ...(resource.availability.status === "uncertain"
          ? ["availability-uncertain" as const]
          : []),
        conditionalReasonForDemand(demand),
      ]),
    };
  }
  const demandMicrounits = issuedQuotaDemandMicrounitsFor(
    demand,
    resource.quota,
    analysis,
    {
      providerId: resource.offeringRef.providerId,
      subjectId: resource.id,
    },
  );
  if (demandMicrounits === null || demandMicrounits.unit !== ledger.unit) {
    return { status: "unavailable", ledger, reasonCode: "demand-unknown" };
  }
  if (demand.demand.unit !== ledger.unit) {
    return { status: "unavailable", ledger, reasonCode: "quota-unit-mismatch" };
  }

  const conditional =
    demand.confidence === "user-observed" ||
    resource.quota.kind === "calibrated" ||
    resource.availability.status === "uncertain";
  if (conditional) {
    const reservedMicrounits = demandMicrounits.high;
    if (reservedMicrounits === null || reservedMicrounits <= 0) {
      return { status: "unavailable", ledger, reasonCode: "demand-unknown" };
    }
    const reservedUnits = fromSubscriptionQuotaMicrounits(reservedMicrounits);
    let nextLedger = ledger;
    let reservation: ConditionalSubscriptionQuotaReservation | null = null;
    if (reservedMicrounits <= ledger.remainingMicrounits) {
      reservation = {
        taskId,
        routeIdentity: { ...ledger.routeIdentity },
        unit: ledger.unit,
        reservedUnits,
        demand: { ...demand.demand },
        reservationBasis: "high-conditional",
      };
      nextLedger = issueLedger({
        ...ledger,
        remainingMicrounits: ledger.remainingMicrounits - reservedMicrounits,
        remainingUnits: fromSubscriptionQuotaMicrounits(
          ledger.remainingMicrounits - reservedMicrounits,
        ),
        reservations: [...ledger.reservations, reservation],
      }, resource);
    }
    return {
      status: "conditional",
      ledger: nextLedger,
      reservation,
      reasonCodes: normalizeConditionalReasonCodes([
        ...(resource.availability.status === "uncertain"
          ? ["availability-uncertain" as const]
          : []),
        ...(demand.confidence === "user-observed"
          ? ["consumption-user-observed" as const]
          : []),
        ...(resource.quota.kind === "calibrated"
          ? ["quota-calibrated" as const]
          : []),
        ...(reservation === null
          ? ["quota-insufficient-observed" as const]
          : []),
      ]),
    };
  }

  const reservedMicrounits = demandMicrounits.expected;
  if (reservedMicrounits === null || reservedMicrounits <= 0) {
    return { status: "unavailable", ledger, reasonCode: "demand-unknown" };
  }
  const reservedUnits = fromSubscriptionQuotaMicrounits(reservedMicrounits);
  const deficitMicrounits = Math.max(
    0,
    reservedMicrounits - ledger.remainingMicrounits,
  );
  const deficitUnits = fromSubscriptionQuotaMicrounits(deficitMicrounits);
  const overage = resolvePaidOverage({
    policy: resource.overage,
    quotaKind: resource.quota.kind,
    quotaUnit: quotaUnit(resource),
    routeIdentity: ledger.routeIdentity,
    planningAsOf: input.planningAsOf,
    deficitUnits,
    overageUnitsAlreadyUsed: ledger.overageUnitsUsed,
    exactMicrounits: {
      deficit: deficitMicrounits,
      alreadyUsed: ledger.overageMicrounitsUsed,
    },
  });
  if (deficitUnits > 0 && overage.status !== "covered") {
    return { status: "unavailable", ledger, reasonCode: "overage-unavailable" };
  }

  const reservation: ConfirmedSubscriptionQuotaReservation = {
    taskId,
    routeIdentity: { ...ledger.routeIdentity },
    unit: ledger.unit,
    reservedUnits,
    demand: { ...demand.demand },
    reservationBasis: "expected-confirmed",
  };
  const nextOverageMicrounitsUsed =
    ledger.overageMicrounitsUsed +
    (overage.status === "covered" ? deficitMicrounits : 0);
  const nextOverageUnitsUsed = fromSubscriptionQuotaMicrounits(
    nextOverageMicrounitsUsed,
  );
  const nextOverageCostMicroUsd =
    ledger.overageCostMicroUsd +
    (overage.status === "covered" ? overage.costMicroUsd : 0);
  if (
    !Number.isSafeInteger(nextOverageMicrounitsUsed) ||
    !Number.isSafeInteger(nextOverageCostMicroUsd)
  ) {
    return { status: "unavailable", ledger, reasonCode: "overage-unavailable" };
  }
  const nextLedger: NumericDerivedQuotaLedger = issueLedger({
    ...ledger,
    remainingMicrounits: Math.max(
      0,
      ledger.remainingMicrounits - reservedMicrounits,
    ),
    remainingUnits: fromSubscriptionQuotaMicrounits(
      Math.max(0, ledger.remainingMicrounits - reservedMicrounits),
    ),
    overageUnitsUsed: nextOverageUnitsUsed,
    overageMicrounitsUsed: nextOverageMicrounitsUsed,
    overageCostMicroUsd: nextOverageCostMicroUsd,
    reservations: [...ledger.reservations, reservation],
  }, resource);
  return {
    status: "reserved",
    ledger: nextLedger,
    reservation,
    overage,
  };
}

export function selectCanonicalSubscriptionResource(
  candidates: readonly SubscriptionLedgerCandidate[],
  analysis: QuotaDemandInput["analysis"],
  planningAsOf: string,
): { candidate: SubscriptionLedgerCandidate; reservation: QuotaReservationResult } | null {
  if (candidates.length === 0) return null;
  const providerId = candidates[0].routeIdentity.providerId;
  const offeringId = candidates[0].routeIdentity.offeringId;
  if (
    candidates.some(
      ({ routeIdentity }) =>
        routeIdentity.providerId !== providerId ||
        routeIdentity.offeringId !== offeringId,
    )
  ) {
    throw new Error("Canonical resource selection compares one Offering at a time.");
  }
  candidates.forEach(({ resource, ledger, routeIdentity }) => {
    if (
      !isResolverIssuedSubscriptionResourceForPlanningAsOf(
        resource,
        planningAsOf,
      ) ||
      !isDerivedSubscriptionQuotaLedger(ledger) ||
      ledgerResources.get(ledger) !== resource ||
      !routeMatchesResource(routeIdentity, resource) ||
      !sameRoute(routeIdentity, ledger.routeIdentity) ||
      ledger.planningAsOf !== planningAsOf
    ) {
      throw new Error("Canonical resource candidate identities must match exactly.");
    }
  });
  assertUniqueRouteIdentities(candidates.map(({ routeIdentity }) => routeIdentity));
  const sorted = [...candidates].sort((left, right) =>
    compareRouteIdentities(left.routeIdentity, right.routeIdentity),
  );
  let conditionalWithoutReservation:
    | { candidate: SubscriptionLedgerCandidate; reservation: QuotaReservationResult }
    | null = null;
  for (const candidate of sorted) {
    const reservation = reserveSubscriptionQuota({
      resource: candidate.resource,
      ledger: candidate.ledger,
      taskId: analysis.taskId,
      analysis,
      demand: candidate.demand,
      planningAsOf,
    });
    if (reservation.status === "unavailable") continue;
    if (reservation.status === "conditional" && reservation.reservation === null) {
      conditionalWithoutReservation ??= { candidate, reservation };
      continue;
    }
    return { candidate, reservation };
  }
  return conditionalWithoutReservation;
}
