import { z } from "zod";

import { normalizeConditionalReasonCodes } from "@/lib/offerings/route-identity";
import type {
  AccessProviderId,
  ConditionalReasonCode,
  StoredConnectorEvidenceInput,
} from "@/types/offerings";

const connectorId = z.string().min(1).max(200);
const nonNegativeInteger = z.number().int().nonnegative().finite();
const offeringReferenceSchema = z.strictObject({
  providerId: connectorId,
  offeringId: connectorId,
});
const registeredAdapterSchema = z.strictObject({
  adapterId: connectorId,
  adapterVersion: connectorId,
  snapshotVersion: connectorId,
  maxSnapshotAgeSeconds: nonNegativeInteger,
});
const authenticatedBindingSchema = z.strictObject({
  bindingId: connectorId,
  accountId: connectorId,
  resourceId: connectorId,
  offeringRef: offeringReferenceSchema,
});
const snapshotSchema = z.strictObject({
  adapterId: connectorId,
  adapterVersion: connectorId,
  bindingId: connectorId,
  accountId: connectorId,
  resourceId: connectorId,
  offeringRef: offeringReferenceSchema,
  snapshotId: connectorId,
  snapshotVersion: connectorId,
  capturedAt: z.iso.datetime(),
  replayDetected: z.boolean(),
  receiptStatus: z.enum(["valid", "invalid", "missing"]),
});
const connectorReferenceSchema = z.strictObject({
  kind: z.literal("connector-ref"),
  adapterId: connectorId,
  adapterVersion: connectorId,
  bindingId: connectorId,
  snapshotId: connectorId,
  snapshotVersion: connectorId,
});

export interface RegisteredConnectorAdapterDiagnostic {
  adapterId: string;
  adapterVersion: string;
  snapshotVersion: string;
  maxSnapshotAgeSeconds: number;
}

export interface AuthenticatedConnectorBindingDiagnostic {
  bindingId: string;
  accountId: string;
  resourceId: string;
  offeringRef: {
    providerId: AccessProviderId;
    offeringId: string;
  };
}

export interface ConnectorSnapshotDiagnosticRecord {
  adapterId: string;
  adapterVersion: string;
  bindingId: string;
  accountId: string;
  resourceId: string;
  offeringRef: {
    providerId: AccessProviderId;
    offeringId: string;
  };
  snapshotId: string;
  snapshotVersion: string;
  capturedAt: string;
  replayDetected: boolean;
  receiptStatus: "valid" | "invalid" | "missing";
}

export interface DiagnoseConnectorSnapshotInput {
  reference: StoredConnectorEvidenceInput;
  planningAsOf: string;
  online: boolean;
  registeredAdapters: readonly RegisteredConnectorAdapterDiagnostic[];
  authenticatedBinding: AuthenticatedConnectorBindingDiagnostic;
  snapshot: ConnectorSnapshotDiagnosticRecord | null;
}

export type ConnectorSnapshotDiagnostic =
  | {
      status: "verified-diagnostic";
      adapterId: string;
      adapterVersion: string;
      bindingId: string;
      snapshotId: string;
      snapshotVersion: string;
      capturedAt: string;
    }
  | {
      status: "conditional";
      reasonCodes: readonly [ConditionalReasonCode, ...ConditionalReasonCode[]];
    };

function conditional(
  reasons: readonly ConditionalReasonCode[],
): ConnectorSnapshotDiagnostic {
  return {
    status: "conditional",
    reasonCodes: normalizeConditionalReasonCodes(reasons),
  };
}

function sameOfferingReference(
  left: { providerId: string; offeringId: string },
  right: { providerId: string; offeringId: string },
): boolean {
  return (
    left.providerId === right.providerId && left.offeringId === right.offeringId
  );
}

/**
 * Produces diagnostics only. A successful result is not evidence and cannot be
 * used to construct `VerifiedConnectorEvidence`. Authority remains with a
 * future server-only resolver backed by a closed adapter registry.
 */
export function diagnoseConnectorSnapshot(
  input: DiagnoseConnectorSnapshotInput,
): ConnectorSnapshotDiagnostic {
  const planningAsOf = z.iso.datetime().safeParse(input.planningAsOf);
  const reference = connectorReferenceSchema.safeParse(input.reference);
  const authenticatedBinding = authenticatedBindingSchema.safeParse(
    input.authenticatedBinding,
  );
  const adapters = z
    .array(registeredAdapterSchema)
    .readonly()
    .safeParse(input.registeredAdapters);

  if (
    !planningAsOf.success ||
    !reference.success ||
    !authenticatedBinding.success ||
    !adapters.success ||
    typeof input.online !== "boolean"
  ) {
    return conditional(["connector-unverified"]);
  }

  const matchingAdapters = adapters.data.filter(
    (adapter) =>
      adapter.adapterId === reference.data.adapterId &&
      adapter.adapterVersion === reference.data.adapterVersion,
  );
  if (matchingAdapters.length !== 1 || !input.online || input.snapshot === null) {
    return conditional(["connector-unverified"]);
  }

  const adapter = matchingAdapters[0];
  const snapshot = snapshotSchema.safeParse(input.snapshot);
  if (!snapshot.success) return conditional(["connector-unverified"]);

  const reasons: ConditionalReasonCode[] = [];
  if (
    snapshot.data.adapterId !== adapter.adapterId ||
    snapshot.data.adapterVersion !== adapter.adapterVersion ||
    reference.data.snapshotId !== snapshot.data.snapshotId ||
    reference.data.snapshotVersion !== adapter.snapshotVersion ||
    snapshot.data.snapshotVersion !== adapter.snapshotVersion
  ) {
    reasons.push("connector-unverified");
  }

  if (
    reference.data.bindingId !== authenticatedBinding.data.bindingId ||
    snapshot.data.bindingId !== authenticatedBinding.data.bindingId ||
    snapshot.data.accountId !== authenticatedBinding.data.accountId ||
    snapshot.data.resourceId !== authenticatedBinding.data.resourceId ||
    !sameOfferingReference(
      snapshot.data.offeringRef,
      authenticatedBinding.data.offeringRef,
    )
  ) {
    reasons.push("connector-binding-mismatch");
  }

  const planningTimestamp = Date.parse(planningAsOf.data);
  const capturedTimestamp = Date.parse(snapshot.data.capturedAt);
  const ageMilliseconds = planningTimestamp - capturedTimestamp;
  if (
    ageMilliseconds < 0 ||
    ageMilliseconds > adapter.maxSnapshotAgeSeconds * 1_000
  ) {
    reasons.push("connector-snapshot-stale");
  }
  if (snapshot.data.replayDetected) reasons.push("connector-snapshot-replayed");
  if (snapshot.data.receiptStatus !== "valid") {
    reasons.push("connector-receipt-invalid");
  }

  if (reasons.length > 0) return conditional(reasons);
  return {
    status: "verified-diagnostic",
    adapterId: adapter.adapterId,
    adapterVersion: adapter.adapterVersion,
    bindingId: authenticatedBinding.data.bindingId,
    snapshotId: snapshot.data.snapshotId,
    snapshotVersion: snapshot.data.snapshotVersion,
    capturedAt: snapshot.data.capturedAt,
  };
}
