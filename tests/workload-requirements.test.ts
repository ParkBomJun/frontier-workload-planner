import { describe, expect, it } from "vitest";

import {
  clampTierToAnalysisMinimum,
  deriveAppliedUpgradeTriggers,
  requiredSurfaceForWorkMode,
  supportsRequiredWorkSurface,
  toOfferingEligibilityRequirement,
} from "@/lib/planning/workload-requirements";
import type {
  LegacyTaskAnalysis,
  TaskAnalysis,
  TaskInput,
} from "@/types/domain";

const task: TaskInput = {
  id: "task-1",
  name: "Critical code migration",
  description: "Apply a large change with a fixed delivery date.",
  priority: "high",
  deadlineDate: "2026-07-21",
  failureImpact: "high",
};

const analysis: TaskAnalysis = {
  taskId: task.id,
  taskType: "software-development",
  complexity: "high",
  reasoningDepth: "deep",
  expectedIterations: 3,
  estimatedInputSize: "l",
  estimatedOutputSize: "m",
  uncertainty: "high",
  recommendedModelTier: "balanced",
  workMode: "coding-agent",
  requiredQualityTier: "balanced",
  requiredCapabilities: ["code-editing", "tool-use"],
  upgradeConditions: ["deep-reasoning", "large-code-change"],
  failureRisk: "high",
  riskFactors: ["free-form text cannot activate another rule"],
  rationale: "Fixture",
};

describe("workload requirement contract", () => {
  it("maps every work mode to exactly one required surface without substitution", () => {
    expect(requiredSurfaceForWorkMode("interactive")).toBe("chat");
    expect(requiredSurfaceForWorkMode("coding-agent")).toBe("ide-cli");
    expect(requiredSurfaceForWorkMode("batch")).toBe("batch");

    expect(supportsRequiredWorkSurface("coding-agent", ["chat", "batch"])).toBe(false);
    expect(supportsRequiredWorkSurface("coding-agent", ["ide-cli"])).toBe(true);
  });

  it("projects the closed GPT fields into offering eligibility unchanged", () => {
    expect(
      toOfferingEligibilityRequirement(analysis, [
        { scenario: "expected", inputTokens: 10, outputTokens: 5 },
      ]),
    ).toEqual({
      surface: "ide-cli",
      minimumQualityTier: "balanced",
      requiredCapabilities: ["code-editing", "tool-use"],
      tokenScenarios: [{ scenario: "expected", inputTokens: 10, outputTokens: 5 }],
    });
  });

  it("derives upgrade triggers only from closed fields, user impact, and deadline", () => {
    expect(deriveAppliedUpgradeTriggers(task, analysis)).toEqual([
      "high-failure-exposure",
      "deadline-retry-risk",
      "deep-reasoning",
      "large-code-change",
    ]);

    expect(
      deriveAppliedUpgradeTriggers(
        { ...task, deadlineDate: null, failureImpact: "low" },
        { ...analysis, upgradeConditions: [], riskFactors: ["premium urgent critical"] },
      ),
    ).toEqual([]);
  });

  it("clamps v2 analysis to its hard minimum while preserving legacy behavior", () => {
    expect(clampTierToAnalysisMinimum("economy", analysis)).toBe("balanced");

    const legacy: LegacyTaskAnalysis = {
      taskId: task.id,
      taskType: analysis.taskType,
      complexity: analysis.complexity,
      reasoningDepth: analysis.reasoningDepth,
      expectedIterations: analysis.expectedIterations,
      estimatedInputSize: analysis.estimatedInputSize,
      estimatedOutputSize: analysis.estimatedOutputSize,
      uncertainty: analysis.uncertainty,
      recommendedModelTier: analysis.recommendedModelTier,
      riskFactors: analysis.riskFactors,
      rationale: analysis.rationale,
    };
    expect(clampTierToAnalysisMinimum("economy", legacy)).toBe("economy");
  });
});
