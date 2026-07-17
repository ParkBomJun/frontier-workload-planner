import { z } from "zod";

const isoUtcDateTimeSchema = z.iso.datetime();

function compareIsoUtcDateTimes(left: string, right: string): number {
  const leftEpoch = Date.parse(left);
  const rightEpoch = Date.parse(right);
  if (leftEpoch !== rightEpoch) return leftEpoch - rightEpoch;

  const [leftSecond, leftFraction = ""] = left.slice(0, -1).split(".");
  const [rightSecond, rightFraction = ""] = right.slice(0, -1).split(".");
  if (leftSecond !== rightSecond) return leftSecond.localeCompare(rightSecond);

  const precision = Math.max(leftFraction.length, rightFraction.length);
  return leftFraction
    .padEnd(precision, "0")
    .localeCompare(rightFraction.padEnd(precision, "0"));
}

export interface RestoredPlanningRevisionInput {
  restoredAt: string;
  generatedAt: string;
  confirmedAt: string | null;
  resourceEvidenceObservedAt?: readonly string[];
  overrideRecordedAt?: readonly string[];
}

export interface BestFitPlanningAsOfInput {
  revisionAt: string | null;
  resourceEvidenceObservedAt: readonly string[];
  overrideRecordedAt: readonly string[];
  generatedAt: string | null;
  confirmedAt: string | null;
}

export function latestIsoDateTime(
  ...values: Array<string | null | undefined>
): string | null {
  let latest: string | null = null;

  for (const value of values) {
    if (value === null || value === undefined) continue;
    if (!isoUtcDateTimeSchema.safeParse(value).success) {
      throw new Error("Planning timestamps must be valid ISO UTC date-times.");
    }

    if (latest === null || compareIsoUtcDateTimes(value, latest) > 0) {
      latest = value;
    }
  }

  return latest;
}

export function resolveRestoredPlanningRevisionAt(
  input: RestoredPlanningRevisionInput,
): string {
  const latest = latestIsoDateTime(
    input.restoredAt,
    input.generatedAt,
    input.confirmedAt,
    ...(input.resourceEvidenceObservedAt ?? []),
    ...(input.overrideRecordedAt ?? []),
  );
  if (latest === null) {
    throw new Error("A restored planning revision requires a valid timestamp.");
  }
  return latest;
}

export function advancePlanningRevisionAt(
  current: string | null,
  changedAt: string,
): string {
  const latest = latestIsoDateTime(current, changedAt);
  if (latest === null) {
    throw new Error("A planning revision requires a valid timestamp.");
  }
  return latest;
}

export function resolveBestFitPlanningAsOf(
  input: BestFitPlanningAsOfInput,
): string | null {
  return latestIsoDateTime(
    input.revisionAt,
    ...input.resourceEvidenceObservedAt,
    ...input.overrideRecordedAt,
    input.generatedAt,
    input.confirmedAt,
  );
}
