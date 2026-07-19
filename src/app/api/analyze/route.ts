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

type BodyReadResult =
  | { ok: true; text: string }
  | { ok: false; reason: "too-large" | "read-failed" };

async function readBodyWithinLimit(
  stream: ReadableStream<Uint8Array> | null,
  maxBytes: number,
): Promise<BodyReadResult> {
  if (!stream) return { ok: true, text: "" };

  let reader: ReadableStreamDefaultReader<Uint8Array>;
  try {
    reader = stream.getReader();
  } catch {
    return { ok: false, reason: "read-failed" };
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value?.byteLength) continue;

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel("request body too large").catch(() => undefined);
        return { ok: false, reason: "too-large" };
      }
      chunks.push(value);
    }
  } catch {
    await reader.cancel("request body read failed").catch(() => undefined);
    return { ok: false, reason: "read-failed" };
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return { ok: true, text: new TextDecoder().decode(bytes) };
}

function requestTooLargeResponse() {
  return errorResponse(413, "REQUEST_TOO_LARGE", "요청 본문이 허용 크기를 초과했습니다.");
}

function invalidJsonResponse() {
  return errorResponse(400, "INVALID_JSON", "요청 본문은 유효한 JSON이어야 합니다.");
}

async function parseRequest(request: Request): Promise<AnalyzeRequest | NextResponse<AnalyzeErrorResponse>> {
  const contentLength = request.headers.get("content-length");
  const declaredLength = contentLength === null ? null : Number(contentLength);
  if (
    declaredLength !== null &&
    Number.isFinite(declaredLength) &&
    declaredLength > MAX_REQUEST_BYTES
  ) {
    await request.body?.cancel("declared request body too large").catch(() => undefined);
    return requestTooLargeResponse();
  }

  const bodyRead = await readBodyWithinLimit(request.body, MAX_REQUEST_BYTES);
  if (!bodyRead.ok && bodyRead.reason === "too-large") return requestTooLargeResponse();
  if (!bodyRead.ok) return invalidJsonResponse();

  let body: unknown;
  try {
    body = JSON.parse(bodyRead.text);
  } catch {
    return invalidJsonResponse();
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
    return successResponse("mock", "mock-fixture-v2", createMockAnalysis(tasks));
  }

  if (process.env.ENABLE_LIVE_ANALYSIS !== "true") {
    return errorResponse(
      403,
      "LIVE_ANALYSIS_DISABLED",
      "내 작업 분석이 서버 설정에서 비활성화되어 있습니다. 예시 계획은 계속 사용할 수 있습니다.",
    );
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return errorResponse(
      503,
      "OPENAI_API_KEY_MISSING",
      "서버에 OpenAI API 키가 설정되지 않았습니다. 예시 계획은 계속 사용할 수 있습니다.",
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
        ? "모델이 이 작업 분석을 거부했습니다. 입력을 조정하거나 예시 계획을 사용해 주세요."
        : "내 작업 분석에 실패했습니다. 잠시 후 다시 시도하거나 예시 계획을 사용해 주세요.",
    );
  }
}
