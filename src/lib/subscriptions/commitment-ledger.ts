import { compareRouteIdentities } from "@/lib/offerings/route-identity";
import type { SubscriptionRouteIdentity } from "@/types/offerings";
import type {
  ResolvedSubscriptionResource,
  SubscriptionCommitmentCashComponent,
} from "@/types/subscriptions";

import { isResolverIssuedSubscriptionResource } from "./resource-resolver";
import { toSourceSubscriptionMicrounits } from "./fixed-decimal";

const issuedLedgers = new WeakSet<object>();

export interface SubscriptionCommitmentActivationInput {
  resource: ResolvedSubscriptionResource;
  routeIdentity: SubscriptionRouteIdentity;
}

export interface DerivedSubscriptionCommitmentLedger {
  kind: "subscription-commitment-ledger";
  components: readonly SubscriptionCommitmentCashComponent[];
  totalIncrementalCashMicroUsd: number;
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  Object.values(value).forEach((child) => deepFreeze(child));
  return Object.freeze(value);
}

function issueLedger(
  ledger: DerivedSubscriptionCommitmentLedger,
): DerivedSubscriptionCommitmentLedger {
  const frozen = deepFreeze(ledger);
  issuedLedgers.add(frozen);
  return frozen;
}

function routeMatchesResource(
  routeIdentity: SubscriptionRouteIdentity,
  resource: ResolvedSubscriptionResource,
): boolean {
  return (
    routeIdentity.providerId === resource.offeringRef.providerId &&
    routeIdentity.offeringId === resource.offeringRef.offeringId &&
    routeIdentity.resourceId === resource.id
  );
}

function sameRoute(
  left: SubscriptionRouteIdentity,
  right: SubscriptionRouteIdentity,
): boolean {
  return compareRouteIdentities(left, right) === 0;
}

function exactUsdToMicroUsd(valueUsd: number): number {
  const microUsd = toSourceSubscriptionMicrounits(valueUsd);
  if (microUsd === null) {
    throw new Error("Subscription fee must convert exactly to a safe micro-USD integer.");
  }
  return microUsd;
}

function componentFor(
  resource: ResolvedSubscriptionResource,
  routeIdentity: SubscriptionRouteIdentity,
): SubscriptionCommitmentCashComponent {
  return resource.ownership === "owned"
    ? {
        kind: "existing-included",
        resourceRouteIdentity: { ...routeIdentity },
        incrementalCashMicroUsd: 0,
      }
    : {
        kind: "new-subscription-commitment",
        resourceRouteIdentity: { ...routeIdentity },
        fullPlanPeriodFeeMicroUsd: exactUsdToMicroUsd(resource.commitment.feeUsd),
      };
}

function componentCashMicroUsd(component: SubscriptionCommitmentCashComponent): number {
  return component.kind === "existing-included"
    ? component.incrementalCashMicroUsd
    : component.fullPlanPeriodFeeMicroUsd;
}

function sameComponent(
  left: SubscriptionCommitmentCashComponent,
  right: SubscriptionCommitmentCashComponent,
): boolean {
  return (
    left.kind === right.kind &&
    componentCashMicroUsd(left) === componentCashMicroUsd(right)
  );
}

function totalCashMicroUsd(
  components: readonly SubscriptionCommitmentCashComponent[],
): number {
  const total = components.reduce(
    (sum, component) => sum + componentCashMicroUsd(component),
    0,
  );
  if (!Number.isSafeInteger(total) || total < 0) {
    throw new Error("Subscription commitment total exceeds the safe micro-USD range.");
  }
  return total;
}

export function isDerivedSubscriptionCommitmentLedger(
  value: unknown,
): value is DerivedSubscriptionCommitmentLedger {
  return typeof value === "object" && value !== null && issuedLedgers.has(value);
}

export function createDerivedSubscriptionCommitmentLedger(): DerivedSubscriptionCommitmentLedger {
  return issueLedger({
    kind: "subscription-commitment-ledger",
    components: [],
    totalIncrementalCashMicroUsd: 0,
  });
}

/**
 * Records a caller-selected resource activation for cash accounting only. A
 * resolver-issued resource can still be conditional; this function neither
 * confirms Offering eligibility nor upgrades fee provenance.
 */
export function activateSubscriptionCommitment(
  ledger: DerivedSubscriptionCommitmentLedger,
  activation: SubscriptionCommitmentActivationInput,
): DerivedSubscriptionCommitmentLedger {
  if (!isDerivedSubscriptionCommitmentLedger(ledger)) {
    throw new Error("Subscription commitment activation requires a derived ledger.");
  }
  if (!isResolverIssuedSubscriptionResource(activation.resource)) {
    throw new Error("Subscription commitment activation requires a resolver-issued resource.");
  }
  if (!routeMatchesResource(activation.routeIdentity, activation.resource)) {
    throw new Error("Subscription commitment route must exactly match its resource.");
  }

  const nextComponent = componentFor(activation.resource, activation.routeIdentity);
  const existing = ledger.components.find((component) =>
    sameRoute(component.resourceRouteIdentity, activation.routeIdentity),
  );
  if (existing !== undefined) {
    if (!sameComponent(existing, nextComponent)) {
      throw new Error("One canonical subscription resource cannot have conflicting commitments.");
    }
    return ledger;
  }

  const components = [...ledger.components, nextComponent].sort((left, right) =>
    compareRouteIdentities(left.resourceRouteIdentity, right.resourceRouteIdentity),
  );
  return issueLedger({
    kind: "subscription-commitment-ledger",
    components,
    totalIncrementalCashMicroUsd: totalCashMicroUsd(components),
  });
}

export function buildSubscriptionCommitmentLedger(
  activations: readonly SubscriptionCommitmentActivationInput[],
): DerivedSubscriptionCommitmentLedger {
  return activations.reduce(
    (ledger, activation) => activateSubscriptionCommitment(ledger, activation),
    createDerivedSubscriptionCommitmentLedger(),
  );
}
