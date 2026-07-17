import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { POST } from "@/app/api/analyze/route";
import { MAX_REQUEST_BYTES } from "@/lib/ai/schema";

const encoder = new TextEncoder();
const validRequest = {
  mode: "mock",
  tasks: [
    {
      id: "task-1",
      name: "API 설계",
      description: "검증 가능한 API를 설계한다.",
      priority: "high",
    },
  ],
};

function streamRequest(
  stream: ReadableStream<Uint8Array>,
  headers?: HeadersInit,
): Request {
  return new Request("http://localhost/api/analyze", {
    method: "POST",
    body: stream,
    headers,
    duplex: "half",
  } as RequestInit & { duplex: "half" });
}

async function errorCode(response: Response): Promise<string> {
  const body = (await response.json()) as { error: { code: string } };
  return body.error.code;
}

describe("POST /api/analyze request body limits", () => {
  it("accepts valid Mock JSON at the exact byte limit", async () => {
    const base = JSON.stringify(validRequest);
    const padding = " ".repeat(MAX_REQUEST_BYTES - encoder.encode(base).byteLength);
    const response = await POST(
      new Request("http://localhost/api/analyze", { method: "POST", body: base + padding }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toMatchObject({ ok: true, mode: "mock" });
  });

  it("rejects a declared oversized body before pulling its stream", async () => {
    let pulled = false;
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>(
      {
        pull(controller) {
          pulled = true;
          controller.enqueue(encoder.encode("{}"));
        },
        cancel() {
          cancelled = true;
        },
      },
      { highWaterMark: 0 },
    );
    const response = await POST(
      streamRequest(stream, { "content-length": String(MAX_REQUEST_BYTES + 1) }),
    );

    expect(response.status).toBe(413);
    expect(await errorCode(response)).toBe("REQUEST_TOO_LARGE");
    expect(pulled).toBe(false);
    expect(cancelled).toBe(true);
  });

  it("stops a chunked body as soon as the accumulated bytes exceed the limit", async () => {
    let pullCount = 0;
    let cancelled = false;
    const chunk = encoder.encode("x".repeat(60 * 1_024));
    const stream = new ReadableStream<Uint8Array>(
      {
        pull(controller) {
          pullCount += 1;
          controller.enqueue(chunk);
        },
        cancel() {
          cancelled = true;
        },
      },
      { highWaterMark: 0 },
    );
    const response = await POST(streamRequest(stream, { "content-length": "2" }));

    expect(response.status).toBe(413);
    expect(await errorCode(response)).toBe("REQUEST_TOO_LARGE");
    expect(pullCount).toBe(2);
    expect(cancelled).toBe(true);
  });

  it("contains stream read failures in the existing JSON error contract", async () => {
    const stream = new ReadableStream<Uint8Array>(
      {
        pull(controller) {
          controller.error(new Error("sensitive stream detail"));
        },
      },
      { highWaterMark: 0 },
    );
    const response = await POST(streamRequest(stream));
    const body = await response.text();

    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body).toContain('"code":"INVALID_JSON"');
    expect(body).not.toContain("sensitive stream detail");
  });

  it("treats malformed JSON under the limit as INVALID_JSON", async () => {
    const response = await POST(
      new Request("http://localhost/api/analyze", { method: "POST", body: "{not-json" }),
    );

    expect(response.status).toBe(400);
    expect(await errorCode(response)).toBe("INVALID_JSON");
  });
});
