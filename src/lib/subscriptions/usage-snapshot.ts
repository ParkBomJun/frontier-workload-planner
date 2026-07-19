export const SUBSCRIPTION_USAGE_SNAPSHOT_PREFIX =
  "FWP_USAGE_SNAPSHOT_V1 ";

export const SUBSCRIPTION_USAGE_PERCENT_KEYS = [
  "fiveHourRemainingPercent",
  "weeklyRemainingPercent",
  "modelWeeklyRemainingPercent",
  "dailyRemainingPercent",
  "creditRemainingPercent",
] as const;

export type SubscriptionUsagePercentKey =
  (typeof SUBSCRIPTION_USAGE_PERCENT_KEYS)[number];

export interface SubscriptionUsageSnapshot {
  fiveHourRemainingPercent?: number;
  weeklyRemainingPercent?: number;
  modelWeeklyRemainingPercent?: number;
  dailyRemainingPercent?: number;
  creditRemainingPercent?: number;
  modelLabel?: string;
}

export interface ParsedSubscriptionUsageDescription {
  snapshot: SubscriptionUsageSnapshot;
  note: string;
}

function validPercent(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 100
  );
}

export function parseSubscriptionUsagePercentInput(
  value: string,
): number | null {
  if (value.trim().length === 0) return null;
  const percent = Number(value);
  return validPercent(percent) ? percent : null;
}

function normalizeSnapshot(value: unknown): SubscriptionUsageSnapshot | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const source = value as Record<string, unknown>;
  const snapshot: SubscriptionUsageSnapshot = {};
  for (const key of SUBSCRIPTION_USAGE_PERCENT_KEYS) {
    const percent = source[key];
    if (percent === undefined) continue;
    if (!validPercent(percent)) return null;
    snapshot[key] = percent;
  }

  if (source.modelLabel !== undefined) {
    if (
      typeof source.modelLabel !== "string" ||
      source.modelLabel.length > 80
    ) {
      return null;
    }
    const modelLabel = source.modelLabel.trim();
    if (modelLabel.length > 0) snapshot.modelLabel = modelLabel;
  }

  return snapshot;
}

export function parseSubscriptionUsageDescription(
  description: string,
): ParsedSubscriptionUsageDescription {
  if (!description.startsWith(SUBSCRIPTION_USAGE_SNAPSHOT_PREFIX)) {
    return { snapshot: {}, note: description };
  }

  const payloadStart = SUBSCRIPTION_USAGE_SNAPSHOT_PREFIX.length;
  const lineBreak = description.indexOf("\n", payloadStart);
  const payload = description.slice(
    payloadStart,
    lineBreak === -1 ? description.length : lineBreak,
  );
  try {
    const snapshot = normalizeSnapshot(JSON.parse(payload));
    if (snapshot === null) return { snapshot: {}, note: description };
    return {
      snapshot,
      note: lineBreak === -1 ? "" : description.slice(lineBreak + 1),
    };
  } catch {
    return { snapshot: {}, note: description };
  }
}

export function serializeSubscriptionUsageDescription(
  snapshot: SubscriptionUsageSnapshot,
  note: string,
): string {
  const normalized = normalizeSnapshot(snapshot) ?? {};
  const hasSnapshot =
    SUBSCRIPTION_USAGE_PERCENT_KEYS.some(
      (key) => normalized[key] !== undefined,
    ) || normalized.modelLabel !== undefined;
  if (!hasSnapshot) return note;

  const encoded = `${SUBSCRIPTION_USAGE_SNAPSHOT_PREFIX}${JSON.stringify(
    normalized,
  )}`;
  return note.length === 0 ? encoded : `${encoded}\n${note}`;
}

export function subscriptionUsageBottleneckPercent(
  snapshot: SubscriptionUsageSnapshot,
): number | null {
  const values = SUBSCRIPTION_USAGE_PERCENT_KEYS.flatMap((key) => {
    const value = snapshot[key];
    return value === undefined ? [] : [value];
  });
  return values.length === 0 ? null : Math.min(...values);
}

export function humanizeSubscriptionUsageDescription(
  description: string,
): string {
  const parsed = parseSubscriptionUsageDescription(description);
  const entries: string[] = [];
  const { snapshot } = parsed;
  if (snapshot.fiveHourRemainingPercent !== undefined) {
    entries.push(`5-hour remaining ${snapshot.fiveHourRemainingPercent}%`);
  }
  if (snapshot.weeklyRemainingPercent !== undefined) {
    entries.push(`weekly remaining ${snapshot.weeklyRemainingPercent}%`);
  }
  if (snapshot.modelWeeklyRemainingPercent !== undefined) {
    const model = snapshot.modelLabel
      ? ` (${snapshot.modelLabel})`
      : "";
    entries.push(
      `model-specific weekly${model} remaining ${snapshot.modelWeeklyRemainingPercent}%`,
    );
  }
  if (snapshot.dailyRemainingPercent !== undefined) {
    entries.push(`daily remaining ${snapshot.dailyRemainingPercent}%`);
  }
  if (snapshot.creditRemainingPercent !== undefined) {
    entries.push(`included credits remaining ${snapshot.creditRemainingPercent}%`);
  }

  if (entries.length === 0) return parsed.note;
  const snapshotText = `User-observed limit snapshot: ${entries.join(", ")}.`;
  return parsed.note.trim().length === 0
    ? snapshotText
    : `${snapshotText} Note: ${parsed.note.trim()}`;
}
