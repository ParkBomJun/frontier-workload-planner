import type { SizeBand } from "@/types/domain";

export interface TokenRange {
  low: number;
  expected: number;
  high: number;
}

// These are product assumptions per model call, not values returned by GPT.
// A price resolver must reject any band outside an offering's standard-price condition.
export const INPUT_TOKEN_BANDS: Record<SizeBand, TokenRange> = {
  xs: { low: 500, expected: 1_000, high: 2_000 },
  s: { low: 2_000, expected: 4_000, high: 8_000 },
  m: { low: 8_000, expected: 16_000, high: 32_000 },
  l: { low: 32_000, expected: 64_000, high: 128_000 },
  xl: { low: 128_000, expected: 192_000, high: 256_000 },
};

export const OUTPUT_TOKEN_BANDS: Record<SizeBand, TokenRange> = {
  xs: { low: 250, expected: 500, high: 1_000 },
  s: { low: 500, expected: 1_000, high: 2_000 },
  m: { low: 2_000, expected: 4_000, high: 8_000 },
  l: { low: 8_000, expected: 16_000, high: 32_000 },
  xl: { low: 32_000, expected: 64_000, high: 96_000 },
};
