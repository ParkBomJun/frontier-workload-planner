import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createMockAnalysis } from "@/lib/ai/mock-response";
import type { TaskInput } from "@/types/domain";

const sdk = vi.hoisted(() => ({
  constructorOptions: [] as unknown[],
  parse: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("openai", () => ({
  default: class MockOpenAI {
    responses = { parse: sdk.parse };

    constructor(options: unknown) {
      sdk.constructorOptions.push(options);
    }
  },
}));

import { analyzeTasks } from "@/lib/ai/analyze-tasks";

const task: TaskInput = {
  id: "privacy-task-1",
  name: "Synthetic privacy test",
  description: "Classify this non-sensitive fixture.",
  priority: "high",
  deadlineDate: "2026-07-21",
  failureImpact: "high",
};

const originalModel = process.env.OPENAI_ANALYSIS_MODEL;

describe("Live analysis privacy boundary", () => {
  beforeEach(() => {
    sdk.constructorOptions.length = 0;
    sdk.parse.mockReset();
    process.env.OPENAI_ANALYSIS_MODEL = "gpt-5.6-sol";
  });

  afterEach(() => {
    if (originalModel === undefined) delete process.env.OPENAI_ANALYSIS_MODEL;
    else process.env.OPENAI_ANALYSIS_MODEL = originalModel;
  });

  it("keeps the key server-side and sends only the GPT classification allowlist", async () => {
    sdk.parse.mockResolvedValue({
      model: "gpt-5.6-sol-2026-07-01",
      output: [],
      output_parsed: createMockAnalysis([task]),
    });

    const result = await analyzeTasks([task], "server-secret-sentinel");

    expect(result.model).toBe("gpt-5.6-sol-2026-07-01");
    expect(sdk.constructorOptions).toEqual([
      {
        apiKey: "server-secret-sentinel",
        maxRetries: 0,
        timeout: 30_000,
      },
    ]);
    expect(sdk.parse).toHaveBeenCalledOnce();

    const request = sdk.parse.mock.calls[0]?.[0] as {
      input: string;
      model: string;
      store: boolean;
    };
    expect(request.model).toBe("gpt-5.6-sol");
    expect(request.store).toBe(false);

    const serializedRecords = request.input.slice(request.input.indexOf("\n\n") + 2);
    expect(JSON.parse(serializedRecords)).toEqual({
      tasks: [
        {
          id: task.id,
          name: task.name,
          description: task.description,
        },
      ],
    });
    expect(request.input).not.toContain("priority");
    expect(request.input).not.toContain("deadlineDate");
    expect(request.input).not.toContain("failureImpact");
    expect(request.input).not.toContain("server-secret-sentinel");
    expect(request.input).not.toContain("budget");
    expect(request.input).not.toContain("subscription");
    expect(request.input).not.toContain("quota");
  });
});
