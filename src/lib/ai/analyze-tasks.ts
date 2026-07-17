import "server-only";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";

import type { AnalysisDocument, TaskInput } from "@/types/domain";

import { buildAnalysisInput, ANALYSIS_SYSTEM_PROMPT } from "./prompt";
import { analysisDocumentSchema, MAX_OUTPUT_TOKENS } from "./schema";

const DEFAULT_MODEL = "gpt-5.6";
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_ATTEMPTS = 2;

export class AnalysisServiceError extends Error {
  constructor(
    public readonly code: "MODEL_REFUSAL" | "INVALID_MODEL_OUTPUT" | "UPSTREAM_FAILURE",
    message: string,
  ) {
    super(message);
    this.name = "AnalysisServiceError";
  }
}

interface LiveAnalysisResult {
  analysis: AnalysisDocument;
  model: string;
}

function findRefusal(response: OpenAI.Responses.Response): string | null {
  for (const output of response.output) {
    if (output.type !== "message") continue;

    for (const item of output.content) {
      if (item.type === "refusal") return item.refusal;
    }
  }

  return null;
}

function validateTaskIdentity(analysis: AnalysisDocument, tasks: TaskInput[]): void {
  const idsMatch =
    analysis.tasks.length === tasks.length &&
    analysis.tasks.every((item, index) => item.taskId === tasks[index].id);

  if (!idsMatch) {
    throw new AnalysisServiceError(
      "INVALID_MODEL_OUTPUT",
      "The model output did not preserve the input task identities.",
    );
  }
}

export async function analyzeTasks(tasks: TaskInput[], apiKey: string): Promise<LiveAnalysisResult> {
  const client = new OpenAI({
    apiKey,
    maxRetries: 0,
    timeout: REQUEST_TIMEOUT_MS,
  });
  const requestedModel = process.env.OPENAI_ANALYSIS_MODEL?.trim() || DEFAULT_MODEL;
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await client.responses.parse({
        model: requestedModel,
        instructions: ANALYSIS_SYSTEM_PROMPT,
        input: buildAnalysisInput(tasks),
        reasoning: { effort: "low" },
        max_output_tokens: MAX_OUTPUT_TOKENS,
        store: false,
        text: {
          format: zodTextFormat(analysisDocumentSchema, "workload_analysis"),
          verbosity: "low",
        },
      });

      const refusal = findRefusal(response);
      if (refusal) {
        throw new AnalysisServiceError("MODEL_REFUSAL", "The model declined to analyze this task.");
      }

      const parsed = analysisDocumentSchema.safeParse(response.output_parsed);
      if (!parsed.success) {
        throw new AnalysisServiceError(
          "INVALID_MODEL_OUTPUT",
          "The model response did not match the workload analysis schema.",
        );
      }

      validateTaskIdentity(parsed.data, tasks);

      return {
        analysis: parsed.data,
        model: response.model,
      };
    } catch (error) {
      if (error instanceof AnalysisServiceError && error.code === "MODEL_REFUSAL") {
        throw error;
      }
      lastError = error;
    }
  }

  if (lastError instanceof AnalysisServiceError) throw lastError;
  throw new AnalysisServiceError("UPSTREAM_FAILURE", "The OpenAI request failed after one retry.");
}
