import type { CostScenario } from "@/types/domain";

export function iterationsForCostScenario(
  expectedIterations: number,
  scenario: CostScenario,
): number {
  if (scenario === "low") return Math.max(1, expectedIterations - 1);
  if (scenario === "high") return expectedIterations + 1;
  return expectedIterations;
}
