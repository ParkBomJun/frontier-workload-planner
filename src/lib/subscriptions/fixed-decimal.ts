export const SUBSCRIPTION_QUOTA_DECIMAL_PLACES = 6;
export const SUBSCRIPTION_QUOTA_SCALE = 10 ** SUBSCRIPTION_QUOTA_DECIMAL_PLACES;
export const MAX_SUBSCRIPTION_QUOTA_UNITS =
  Math.floor(Number.MAX_SAFE_INTEGER / SUBSCRIPTION_QUOTA_SCALE);

export function toSubscriptionQuotaMicrounits(value: number): number | null {
  if (!Number.isFinite(value) || value < 0) return null;
  const scaled = Math.round(value * SUBSCRIPTION_QUOTA_SCALE);
  if (
    !Number.isSafeInteger(scaled) ||
    Math.abs(value - scaled / SUBSCRIPTION_QUOTA_SCALE) > 1e-12
  ) {
    return null;
  }
  return scaled;
}

export function fromSubscriptionQuotaMicrounits(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error("Subscription quota microunits must be a non-negative safe integer.");
  }
  return value / SUBSCRIPTION_QUOTA_SCALE;
}
