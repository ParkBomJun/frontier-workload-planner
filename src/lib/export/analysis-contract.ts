import { isBestFitTaskAnalysis } from "@/lib/planning/workload-requirements";
import type { AnalysisContractIdentity, PlanExportContext } from "@/types/domain";

interface ResolvedExportAnalysisContract {
  identity: AnalysisContractIdentity;
  isBestFit: boolean;
}

export function resolveExportAnalysisContract(
  context: PlanExportContext,
): ResolvedExportAnalysisContract {
  const identity = context.analysisContract;
  // Widen for runtime callers that may cross the discriminants despite the TypeScript contract.
  const contractVersion: string = identity.contractVersion;
  const compatibility: string = identity.compatibility;
  const isBestFit = compatibility === "best-fit";
  const identityMatches = isBestFit
    ? contractVersion === "best-fit-analysis-v2"
    : compatibility === "legacy-api-only" && contractVersion === "api-analysis-v1";
  const taskContractsMatch = context.plan.tasks.every(
    (task) => isBestFitTaskAnalysis(task.analysis) === isBestFit,
  );

  if (!identityMatches || !taskContractsMatch) {
    throw new Error("The export analysis contract does not match the planned task analysis.");
  }

  return { identity, isBestFit };
}
