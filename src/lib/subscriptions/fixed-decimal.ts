export const SUBSCRIPTION_QUOTA_DECIMAL_PLACES = 6;
export const SUBSCRIPTION_QUOTA_SCALE = 10 ** SUBSCRIPTION_QUOTA_DECIMAL_PLACES;
export const MAX_SUBSCRIPTION_QUOTA_UNITS =
  Math.floor(Number.MAX_SAFE_INTEGER / SUBSCRIPTION_QUOTA_SCALE);

function sourceDecimalParts(
  value: number,
): { coefficient: bigint; scale: number } | null {
  const match = value
    .toString()
    .toLowerCase()
    .match(/^(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/);
  if (!match) return null;
  const fractional = match[2] ?? "";
  const exponent = Number(match[3] ?? "0");
  if (!Number.isSafeInteger(exponent)) return null;
  return {
    coefficient: BigInt(`${match[1]}${fractional}`),
    scale: fractional.length - exponent,
  };
}

/**
 * Converts a user/provider source value only when its canonical decimal form
 * has at most six fractional digits. Unlike derived arithmetic, this must not
 * absorb extra source precision as floating-point noise.
 */
export function toSourceSubscriptionMicrounits(value: number): number | null {
  if (!Number.isFinite(value) || value < 0) return null;
  const parts = sourceDecimalParts(value);
  if (parts === null || parts.scale > SUBSCRIPTION_QUOTA_DECIMAL_PLACES) {
    return null;
  }
  if (parts.coefficient === BigInt(0)) return 0;
  const scaleUp = SUBSCRIPTION_QUOTA_DECIMAL_PLACES - parts.scale;
  if (scaleUp > 15) return null;
  const scaled = parts.coefficient * BigInt(10) ** BigInt(scaleUp);
  return scaled <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(scaled) : null;
}

/** Converts derived arithmetic while tolerating normal IEEE-754 residue. */
export function toDerivedSubscriptionMicrounits(value: number): number | null {
  if (!Number.isFinite(value) || value < 0) return null;
  const exact = toSourceSubscriptionMicrounits(value);
  if (exact !== null) return exact;
  const scaled = Math.round(value * SUBSCRIPTION_QUOTA_SCALE);
  const reconstructed = scaled / SUBSCRIPTION_QUOTA_SCALE;
  const tolerance =
    Number.EPSILON *
    Math.max(1, Math.abs(value), Math.abs(reconstructed)) *
    4;
  if (
    !Number.isSafeInteger(scaled) ||
    Math.abs(value - reconstructed) > tolerance
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
