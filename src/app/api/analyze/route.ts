import { NextResponse } from "next/server";

import { analyzeTasks, AnalysisServiceError } from "@/lib/ai/analyze-tasks";
import { createMockAnalysis } from "@/lib/ai/mock-response";
import {
  analyzeRequestSchema,
  MAX_REQUEST_BYTES,
  type AnalyzeRequest,
} from "@/lib/ai/schema";
import type { AnalysisMode, AnalyzeErrorResponse, AnalyzeSuccessResponse } from "@/types/domain";

export const runtime = "nodejs";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

function errorResponse(
  status: number,
  code: string,
  message: string,
  details?: AnalyzeErrorResponse["error"]["details"],
) {
  return NextResponse.json<AnalyzeErrorResponse>(
    { ok: false, error: { code, message, ...(details ? { details } : {}) } },
    { status, headers: NO_STORE_HEADERS },
  );
}

function successResponse(
  mode: AnalysisMode,
  model: string,
  analysis: AnalyzeSuccessResponse["analysis"],
) {
  return NextResponse.json<AnalyzeSuccessResponse>(
    {
      ok: true,
      mode,
      model,
      generatedAt: new Date().toISOString(),
      analysis,
    },
    { headers: NO_STORE_HEADERS },
  );
}

async function parseRequest(request: Request): Promise<AnalyzeRequest | NextResponse<AnalyzeErrorResponse>> {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    return errorResponse(413, "REQUEST_TOO_LARGE", "요청 본문이 허용 크기를 초과했습니다.");
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES) {
    return errorResponse(413, "REQUEST_TOO_LARGE", "요청 본문이 허용 크기를 초과했습니다.");
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return errorResponse(400, "INVALID_JSON", "요청 본문은 유효한 JSON이어야 합니다.");
  }

  const parsed = analyzeRequestSchema.safeParse(body);
  if (!parsed.success) {
    const details = parsed.error.issues.slice(0, 8).map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    return errorResponse(400, "INVALID_INPUT", "작업 입력을 확인해 주세요.", details);
  }

  return parsed.data;
}

export async function POST(request: Request) {
  const parsedRequest = await parseRequest(request);
  if (parsedRequest instanceof NextResponse) return parsedRequest;

  const { mode, tasks } = parsedRequest;
  if (mode === "mock") {
    return successResponse("mock", "mock-fixture-v1", createMockAnalysis(tasks));
  }

  if (process.env.ENABLE_LIVE_ANALYSIS !== "true") {
    return errorResponse(
      403,
      "LIVE_ANALYSIS_DISABLED",
      "Live 분석이 서버 설정에서 비활성화되어 있습니다. Mock 분석은 계속 사용할 수 있습니다.",
    );
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return errorResponse(
      503,
      "OPENAI_API_KEY_MISSING",
      "서버에 OpenAI API 키가 설정되지 않았습니다. Mock 분석은 계속 사용할 수 있습니다.",
    );
  }

  try {
    const result = await analyzeTasks(tasks, apiKey);
    return successResponse("live", result.model, result.analysis);
  } catch (error) {
    const isRefusal = error instanceof AnalysisServiceError && error.code === "MODEL_REFUSAL";
    return errorResponse(
      isRefusal ? 422 : 502,
      isRefusal ? "MODEL_REFUSAL" : "LIVE_ANALYSIS_FAILED",
      isRefusal
        ? "모델이 이 작업 분석을 거부했습니다. 입력을 조정하거나 Mock 분석을 사용해 주세요."
        : "Live 분석에 실패했습니다. 잠시 후 다시 시도하거나 Mock 분석을 사용해 주세요.",
    );
  }
}
