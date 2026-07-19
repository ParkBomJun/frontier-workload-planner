import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createMockAnalysis } from "@/lib/ai/mock-response";

const live = vi.hoisted(() => {
  class MockAnalysisServiceError extends Error {
    constructor(
      public readonly code: "MODEL_REFUSAL" | "INVALID_MODEL_OUTPUT" | "UPSTREAM_FAILURE",
      message: string,
    ) {
      super(message);
    }
  }

  return {
    analyzeTasks: vi.fn(),
    AnalysisServiceError: MockAnalysisServiceError,
  };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/ai/analyze-tasks", () => live);

import { POST } from "@/app/api/analyze/route";

const task = {
  id: "privacy-task-1",
  name: "Synthetic privacy test",
  description: "Classify this non-sensitive fixture.",
  priority: "medium" as const,
  deadlineDate: null,
  failureImpact: "medium" as const,
};

const originalEnable = process.env.ENABLE_LIVE_ANALYSIS;
const originalKey = process.env.OPENAI_API_KEY;

function liveRequest() {
  return new Request("http://localhost/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "live", tasks: [task] }),
  });
}

async function responseBody(response: Response) {
  return (await response.json()) as {
    ok: boolean;
    error?: { code: string; message: string };
  };
}

describe("POST /api/analyze Live gate and secret boundary", () => {
  beforeEach(() => {
    live.analyzeTasks.mockReset();
    delete process.env.OPENAI_API_KEY;
    process.env.ENABLE_LIVE_ANALYSIS = "false";
  });

  afterEach(() => {
    if (originalEnable === undefined) delete process.env.ENABLE_LIVE_ANALYSIS;
    else process.env.ENABLE_LIVE_ANALYSIS = originalEnable;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
    vi.restoreAllMocks();
  });

  it("fails closed without calling OpenAI unless the gate is exactly true", async () => {
    const response = await POST(liveRequest());
    const body = await responseBody(response);

    expect(response.status).toBe(403);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body).toMatchObject({ ok: false, error: { code: "LIVE_ANALYSIS_DISABLED" } });
    expect(live.analyzeTasks).not.toHaveBeenCalled();
  });

  it("does not call OpenAI when the server environment has no key", async () => {
    process.env.ENABLE_LIVE_ANALYSIS = "true";

    const response = await POST(liveRequest());
    const body = await responseBody(response);

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body).toMatchObject({ ok: false, error: { code: "OPENAI_API_KEY_MISSING" } });
    expect(live.analyzeTasks).not.toHaveBeenCalled();
  });

  it("uses the server key for a successful Live request without returning it", async () => {
    process.env.ENABLE_LIVE_ANALYSIS = "true";
    process.env.OPENAI_API_KEY = "server-secret-sentinel";
    live.analyzeTasks.mockResolvedValue({
      model: "gpt-5.6-sol-2026-07-01",
      analysis: createMockAnalysis([task]),
    });

    const response = await POST(liveRequest());
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(live.analyzeTasks).toHaveBeenCalledWith([task], "server-secret-sentinel");
    expect(text).not.toContain("server-secret-sentinel");
    expect(JSON.parse(text)).toMatchObject({
      ok: true,
      mode: "live",
      model: "gpt-5.6-sol-2026-07-01",
      analysis: { contractVersion: "best-fit-analysis-v2" },
    });
  });

  it("contains upstream secrets and errors without logging or returning them", async () => {
    process.env.ENABLE_LIVE_ANALYSIS = "true";
    process.env.OPENAI_API_KEY = "server-secret-sentinel";
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    live.analyzeTasks.mockRejectedValue(
      new Error("raw upstream body with server-secret-sentinel and private task text"),
    );

    const response = await POST(liveRequest());
    const text = await response.text();

    expect(response.status).toBe(502);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(text).toContain('"code":"LIVE_ANALYSIS_FAILED"');
    expect(text).not.toContain("server-secret-sentinel");
    expect(text).not.toContain("raw upstream body");
    expect(text).not.toContain("private task text");
    expect(consoleError).not.toHaveBeenCalled();
    expect(consoleLog).not.toHaveBeenCalled();
    expect(consoleWarn).not.toHaveBeenCalled();
  });
});
