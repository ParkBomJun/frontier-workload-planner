"use client";

import { type FormEvent, useMemo, useRef, useState } from "react";

import { AnalysisResults } from "@/components/analysis-results";
import { BudgetSettings, type PlanningFormState } from "@/components/budget-settings";
import { TaskEditor } from "@/components/task-editor";
import { allocateBudget } from "@/lib/calculation/allocate-budget";
import type {
  AnalysisMode,
  AnalyzeApiResponse,
  AnalyzeSuccessResponse,
  PlanningSettings,
  TaskInput,
} from "@/types/domain";

const INITIAL_TASKS: TaskInput[] = [{ id: "task-1", name: "", description: "" }];

const SAMPLE_TASKS: TaskInput[] = [
  {
    id: "task-1",
    name: "고객 지원 대시보드 API 설계",
    description:
      "기존 Next.js 앱에 고객 문의를 조회하고 상태를 변경하는 서버 API를 설계한다. 인증 경계, 입력 검증, 오류 응답, 테스트 전략을 포함한 구현 계획이 필요하다.",
  },
  {
    id: "task-2",
    name: "시장 조사 메모 작성",
    description:
      "공개 자료를 바탕으로 AI 업무 자동화 시장의 주요 고객군, 경쟁 범주, 도입 위험을 비교한 간결한 조사 메모를 작성한다.",
  },
  {
    id: "task-3",
    name: "출시 안내문 초안",
    description:
      "새 예산 계획 기능을 처음 사용하는 팀을 위한 500자 내외의 출시 안내문과 핵심 사용 예시를 작성한다.",
  },
];

const INITIAL_SETTINGS: PlanningFormState = {
  budgetUsd: "5.00",
  deadlineDays: "7",
  strategy: "balanced",
};

type RequestStatus = "idle" | "loading" | "success" | "error";

interface VisibleError {
  code?: string;
  message: string;
}

interface CompletedAnalysis {
  response: AnalyzeSuccessResponse;
  tasks: TaskInput[];
}

function parsePlanningSettings(value: PlanningFormState): PlanningSettings | null {
  const budgetUsd = Number(value.budgetUsd);
  const deadlineDays = Number(value.deadlineDays);
  if (!Number.isFinite(budgetUsd) || budgetUsd < 0.01 || budgetUsd > 10_000) return null;
  if (!Number.isInteger(deadlineDays) || deadlineDays < 1 || deadlineDays > 90) return null;
  return { budgetUsd, deadlineDays, strategy: value.strategy };
}

export default function Home() {
  const [tasks, setTasks] = useState<TaskInput[]>(INITIAL_TASKS);
  const [settings, setSettings] = useState<PlanningFormState>(INITIAL_SETTINGS);
  const [mode, setMode] = useState<AnalysisMode>("mock");
  const [status, setStatus] = useState<RequestStatus>("idle");
  const [completed, setCompleted] = useState<CompletedAnalysis | null>(null);
  const [visibleError, setVisibleError] = useState<VisibleError | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const nextTaskNumber = useRef(2);

  const parsedSettings = useMemo(() => parsePlanningSettings(settings), [settings]);
  const plan = useMemo(() => {
    if (!completed || !parsedSettings) return null;
    return allocateBudget(completed.tasks, completed.response.analysis.tasks, parsedSettings);
  }, [completed, parsedSettings]);

  function invalidateAnalysis() {
    setCompleted(null);
    setVisibleError(null);
    setStatus("idle");
  }

  function updateTask(taskId: string, field: "name" | "description", value: string) {
    setTasks((current) =>
      current.map((task) => (task.id === taskId ? { ...task, [field]: value } : task)),
    );
    setShowValidation(false);
    invalidateAnalysis();
  }

  function addTask() {
    if (tasks.length >= 8) return;
    const taskId = `task-${nextTaskNumber.current}`;
    nextTaskNumber.current += 1;
    setTasks((current) => [...current, { id: taskId, name: "", description: "" }]);
    setShowValidation(false);
    invalidateAnalysis();
    window.requestAnimationFrame(() => document.getElementById(`task-name-${taskId}`)?.focus());
  }

  function removeTask(taskId: string) {
    if (tasks.length === 1) return;
    const index = tasks.findIndex((task) => task.id === taskId);
    const remaining = tasks.filter((task) => task.id !== taskId);
    const focusTarget = remaining[Math.min(Math.max(index, 0), remaining.length - 1)];
    setTasks(remaining);
    setShowValidation(false);
    invalidateAnalysis();
    window.requestAnimationFrame(() => {
      const target = focusTarget
        ? document.getElementById(`task-name-${focusTarget.id}`)
        : document.getElementById("add-task-button");
      target?.focus();
    });
  }

  function loadSample() {
    setTasks(SAMPLE_TASKS.map((task) => ({ ...task })));
    nextTaskNumber.current = 4;
    setShowValidation(false);
    invalidateAnalysis();
  }

  function updateSettings(value: PlanningFormState) {
    setSettings(value);
    setVisibleError(null);
    setShowValidation(false);
  }

  function updateMode(value: AnalysisMode) {
    setMode(value);
    invalidateAnalysis();
  }

  async function submitAnalysis(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedTasks = tasks.map((task) => ({
      ...task,
      name: task.name.trim(),
      description: task.description.trim(),
    }));
    const hasInvalidTask = normalizedTasks.some((task) => !task.name || !task.description);
    const planningSettings = parsePlanningSettings(settings);

    if (hasInvalidTask || !planningSettings) {
      setCompleted(null);
      setStatus("error");
      setShowValidation(true);
      setVisibleError({ message: "모든 작업과 계획 설정을 확인해 주세요." });
      return;
    }

    setTasks(normalizedTasks);
    setStatus("loading");
    setShowValidation(false);
    setVisibleError(null);
    setCompleted(null);

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 75_000);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, tasks: normalizedTasks }),
        signal: controller.signal,
      });
      const payload = (await response.json()) as AnalyzeApiResponse;

      if (!response.ok || !payload.ok) {
        const error = payload.ok
          ? { message: "분석 요청에 실패했습니다." }
          : { code: payload.error.code, message: payload.error.message };
        setStatus("error");
        setVisibleError(error);
        return;
      }

      setCompleted({
        response: payload,
        tasks: normalizedTasks.map((task) => ({ ...task })),
      });
      setStatus("success");
    } catch (error) {
      const timedOut = error instanceof DOMException && error.name === "AbortError";
      setStatus("error");
      setVisibleError({
        code: timedOut ? "REQUEST_TIMEOUT" : "NETWORK_ERROR",
        message: timedOut
          ? "분석 시간이 초과되었습니다. Mock 분석을 사용하거나 잠시 후 다시 시도해 주세요."
          : "서버에 연결하지 못했습니다. 개발 서버와 네트워크 상태를 확인해 주세요.",
      });
    } finally {
      window.clearTimeout(timeout);
    }
  }

  const statusMessage =
    status === "loading"
      ? `${tasks.length}개 작업을 분석하고 있습니다.`
      : status === "success"
        ? `${completed?.tasks.length ?? 0}개 작업 분석이 완료되었습니다.`
        : status === "error"
          ? "분석 요청을 완료하지 못했습니다."
          : "";

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f4f5f0] text-[#17221c]">
      <div className="pointer-events-none fixed inset-0 opacity-70" aria-hidden="true">
        <div className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-[#d7e7d9] blur-3xl" />
        <div className="absolute -right-20 top-[-5rem] h-80 w-80 rounded-full bg-[#f3d9b3] blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between gap-4 border-b border-[#17221c]/10 pb-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#173f31] font-mono text-sm font-bold text-white shadow-[0_8px_24px_rgba(23,63,49,0.22)]">
              FW
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-[-0.01em]">Frontier Workload Planner</p>
              <p className="text-xs text-[#536159]">Checkpoint 2 · budget-aware planning</p>
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-[#173f31]/15 bg-white/70 px-3 py-1.5 text-xs font-semibold text-[#365649] backdrop-blur">
            Mock first
          </span>
        </header>

        <section className="py-10 sm:py-14">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#b85331]">
            Describe · classify · calculate · allocate
          </p>
          <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.45fr)] lg:items-end">
            <h1 className="max-w-4xl text-4xl font-semibold leading-[1.05] tracking-[-0.045em] text-[#12281f] sm:text-5xl lg:text-[3.5rem]">
              여러 작업을 하나의 요청으로 분석하고,
              <br className="hidden sm:block" /> 예산 안에서 모델 등급을 배분합니다.
            </h1>
            <p className="max-w-xl text-base leading-7 text-[#536159] lg:justify-self-end">
              GPT는 등급과 크기 구간만 판단합니다. 토큰·가격·예산 조정은 공개된 고정 규칙으로 계산합니다.
            </p>
          </div>
        </section>

        <form onSubmit={submitAnalysis} noValidate className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(330px,0.55fr)] xl:items-start">
          <TaskEditor
            tasks={tasks}
            disabled={status === "loading"}
            showValidation={showValidation}
            onAdd={addTask}
            onRemove={removeTask}
            onChange={updateTask}
            onLoadSample={loadSample}
          />

          <aside className="min-w-0 space-y-4 xl:sticky xl:top-5">
            <BudgetSettings
              value={settings}
              disabled={status === "loading"}
              showValidation={showValidation}
              onChange={updateSettings}
            />

            <section className="rounded-[1.5rem] border border-[#173f31]/12 bg-white/90 p-5 shadow-[0_18px_50px_rgba(28,47,37,0.08)] sm:p-6">
              <fieldset>
                <legend className="mb-2 text-sm font-bold text-[#34443b]">분석 모드</legend>
                <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#edf0eb] p-1.5">
                  {(["mock", "live"] as const).map((item) => (
                    <label key={item} className="cursor-pointer">
                      <input
                        type="radio"
                        name="analysis-mode"
                        value={item}
                        checked={mode === item}
                        onChange={() => updateMode(item)}
                        disabled={status === "loading"}
                        className="peer sr-only"
                      />
                      <span className="block rounded-xl px-3 py-3 text-[#647169] transition peer-checked:bg-white peer-checked:text-[#173f31] peer-checked:shadow-[0_4px_16px_rgba(26,48,37,0.1)] peer-focus-visible:ring-4 peer-focus-visible:ring-[#2f6c55]/20">
                        <span className="block text-sm font-bold">{item === "mock" ? "Mock" : "Live GPT-5.6"}</span>
                        <span className="mt-0.5 block text-xs leading-5 opacity-80">
                          {item === "mock" ? "키와 비용 없이 fixture 사용" : "서버 키로만 실제 요청"}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <button
                type="submit"
                disabled={status === "loading"}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#173f31] px-5 py-4 text-sm font-bold text-white shadow-[0_12px_28px_rgba(23,63,49,0.2)] transition hover:bg-[#205541] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2f6c55]/20 disabled:cursor-wait disabled:opacity-65"
              >
                {status === "loading" ? (
                  <>
                    <span className="size-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                    {tasks.length}개 작업 분석 중…
                  </>
                ) : (
                  <>
                    {mode === "mock" ? "Mock 계획 만들기" : "Live 계획 만들기"}
                    <span aria-hidden="true">→</span>
                  </>
                )}
              </button>
              <p className="mt-3 text-center text-xs leading-5 text-[#66736b]">
                Live 요청은 버튼을 누를 때만 실행되며 API 키는 브라우저로 전달되지 않습니다.
              </p>
            </section>
          </aside>
        </form>

        <p className="sr-only" aria-live="polite">
          {statusMessage}
        </p>

        {visibleError && status === "error" ? (
          <div role="alert" className="mt-6 rounded-2xl border border-[#cf6845]/25 bg-[#fff5ef] p-5 text-[#7c331f]">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-[#cf6845]/12 font-bold">!</span>
              <div>
                <p className="font-bold">분석을 완료하지 못했습니다.</p>
                <p className="mt-1 text-sm leading-6 text-[#91452d]">{visibleError.message}</p>
                {visibleError.code ? (
                  <p className="mt-2 font-mono text-xs text-[#a45b43]">{visibleError.code}</p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {completed && plan ? (
          <div className="mt-8">
            <AnalysisResults
              plan={plan}
              analysisMode={completed.response.mode}
              analysisModel={completed.response.model}
              generatedAt={completed.response.generatedAt}
            />
          </div>
        ) : null}

        {completed && !plan ? (
          <div className="mt-6 rounded-2xl border border-[#c88743]/25 bg-[#fff8ec] p-4 text-sm text-[#71491f]">
            예산과 검토 기한을 유효하게 입력하면 기존 GPT 분석으로 비용 계획을 즉시 다시 계산합니다.
          </div>
        ) : null}

        <footer className="mt-12 flex flex-col gap-2 border-t border-[#17221c]/10 py-5 text-xs text-[#68766e] sm:flex-row sm:items-center sm:justify-between">
          <span>Budget-aware recommended plan · not mathematical optimization</span>
          <span>GPT judgment ≠ deterministic cost calculation</span>
        </footer>
      </div>
    </main>
  );
}
