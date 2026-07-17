"use client";

import { type FormEvent, useState } from "react";

import type {
  AnalysisMode,
  AnalyzeApiResponse,
  AnalyzeSuccessResponse,
  TaskAnalysis,
} from "@/types/domain";

const SAMPLE_TASK = {
  name: "고객 지원 대시보드 API 설계",
  description:
    "기존 Next.js 앱에 고객 문의를 조회하고 상태를 변경하는 서버 API를 설계한다. 인증 경계, 입력 검증, 오류 응답, 테스트 전략을 포함한 구현 계획이 필요하다.",
};

const FIELD_LABELS: Array<{ key: keyof TaskAnalysis; label: string }> = [
  { key: "taskType", label: "작업 유형" },
  { key: "complexity", label: "복잡도" },
  { key: "reasoningDepth", label: "추론 깊이" },
  { key: "expectedIterations", label: "예상 반복" },
  { key: "estimatedInputSize", label: "입력 구간" },
  { key: "estimatedOutputSize", label: "출력 구간" },
  { key: "uncertainty", label: "불확실성" },
] as const;

type RequestStatus = "idle" | "loading" | "success" | "error";

interface VisibleError {
  code?: string;
  message: string;
}

export default function Home() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [mode, setMode] = useState<AnalysisMode>("mock");
  const [status, setStatus] = useState<RequestStatus>("idle");
  const [result, setResult] = useState<AnalyzeSuccessResponse | null>(null);
  const [visibleError, setVisibleError] = useState<VisibleError | null>(null);

  function loadSample() {
    setName(SAMPLE_TASK.name);
    setDescription(SAMPLE_TASK.description);
    setVisibleError(null);
    setStatus("idle");
  }

  async function submitAnalysis(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();
    const trimmedDescription = description.trim();
    if (!trimmedName || !trimmedDescription) {
      setResult(null);
      setStatus("error");
      setVisibleError({ message: "작업명과 작업 설명을 모두 입력해 주세요." });
      return;
    }

    setStatus("loading");
    setVisibleError(null);
    setResult(null);

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 75_000);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          tasks: [
            {
              id: "task-1",
              name: trimmedName,
              description: trimmedDescription,
            },
          ],
        }),
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

      setResult(payload);
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

  return (
    <main className="min-h-screen overflow-hidden bg-[#f4f5f0] text-[#17221c]">
      <div className="pointer-events-none fixed inset-0 opacity-70" aria-hidden="true">
        <div className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-[#d7e7d9] blur-3xl" />
        <div className="absolute -right-20 top-[-5rem] h-80 w-80 rounded-full bg-[#f3d9b3] blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between border-b border-[#17221c]/10 pb-5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-[#173f31] font-mono text-sm font-bold text-white shadow-[0_8px_24px_rgba(23,63,49,0.22)]">
              FW
            </span>
            <div>
              <p className="text-sm font-semibold tracking-[-0.01em]">Frontier Workload Planner</p>
              <p className="text-xs text-[#536159]">P0 · workload classification</p>
            </div>
          </div>
          <span className="rounded-full border border-[#173f31]/15 bg-white/70 px-3 py-1.5 text-xs font-semibold text-[#365649] backdrop-blur">
            Mock first
          </span>
        </header>

        <section className="grid flex-1 gap-10 py-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-start lg:gap-16 lg:py-16">
          <div className="lg:sticky lg:top-10">
            <p className="mb-4 font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#bd5a33]">
              Budget-aware planning, one clear step at a time
            </p>
            <h1 className="max-w-xl text-4xl font-semibold leading-[1.04] tracking-[-0.045em] text-[#12281f] sm:text-5xl lg:text-[3.65rem]">
              작업을 설명하면,
              <br />
              필요한 AI 등급을
              <br />
              구조화해 드립니다.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-[#536159] sm:text-lg">
              GPT는 복잡도와 크기 구간만 판단합니다. 토큰, 가격, 예산 계산은 이후의 결정론적 계산 엔진이
              담당합니다.
            </p>

            <div className="mt-8 grid max-w-lg grid-cols-3 gap-2 text-center text-xs sm:text-sm">
              {[
                ["01", "Describe"],
                ["02", "Classify"],
                ["03", "Review"],
              ].map(([number, label]) => (
                <div key={number} className="rounded-2xl border border-[#173f31]/10 bg-white/55 px-3 py-4">
                  <span className="block font-mono text-[#bd5a33]">{number}</span>
                  <span className="mt-1 block font-semibold text-[#365649]">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <form
              noValidate
              onSubmit={submitAnalysis}
              className="rounded-[1.75rem] border border-white/80 bg-white/85 p-5 shadow-[0_24px_70px_rgba(28,47,37,0.12)] backdrop-blur sm:p-7"
            >
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7a877f]">Single task</p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-[-0.025em]">분석할 작업</h2>
                </div>
                <button
                  type="button"
                  onClick={loadSample}
                  disabled={status === "loading"}
                  className="rounded-full border border-[#173f31]/15 px-3.5 py-2 text-xs font-bold text-[#365649] transition hover:border-[#173f31]/35 hover:bg-[#edf3ee] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  샘플 불러오기
                </button>
              </div>

              <div className="space-y-5">
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-[#34443b]">작업명</span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    maxLength={100}
                    disabled={status === "loading"}
                    placeholder="예: 고객 지원 대시보드 API 설계"
                    className="w-full rounded-xl border border-[#173f31]/15 bg-[#fbfcf9] px-4 py-3.5 text-[15px] outline-none transition placeholder:text-[#97a099] focus:border-[#2f6c55] focus:ring-4 focus:ring-[#2f6c55]/10 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 flex items-center justify-between text-sm font-bold text-[#34443b]">
                    <span>작업 설명</span>
                    <span className="font-mono text-[11px] font-normal text-[#8b958f]">
                      {description.length} / 2,000
                    </span>
                  </span>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    maxLength={2_000}
                    disabled={status === "loading"}
                    rows={6}
                    placeholder="목표, 산출물, 제약, 품질 기준을 구체적으로 적어 주세요."
                    className="w-full resize-none rounded-xl border border-[#173f31]/15 bg-[#fbfcf9] px-4 py-3.5 text-[15px] leading-6 outline-none transition placeholder:text-[#97a099] focus:border-[#2f6c55] focus:ring-4 focus:ring-[#2f6c55]/10 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </label>

                <fieldset>
                  <legend className="mb-2 text-sm font-bold text-[#34443b]">분석 모드</legend>
                  <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#edf0eb] p-1.5">
                    {(["mock", "live"] as const).map((item) => (
                      <label
                        key={item}
                        className={`cursor-pointer rounded-xl px-3 py-3 transition ${
                          mode === item
                            ? "bg-white text-[#173f31] shadow-[0_4px_16px_rgba(26,48,37,0.1)]"
                            : "text-[#6a756f] hover:text-[#34443b]"
                        }`}
                      >
                        <input
                          type="radio"
                          name="analysis-mode"
                          value={item}
                          checked={mode === item}
                          onChange={() => setMode(item)}
                          disabled={status === "loading"}
                          className="sr-only"
                        />
                        <span className="block text-sm font-bold">{item === "mock" ? "Mock" : "Live GPT-5.6"}</span>
                        <span className="mt-0.5 block text-[11px] opacity-70">
                          {item === "mock" ? "키와 비용 없이 fixture 사용" : "서버 키로만 실제 요청"}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>

              <button
                type="submit"
                disabled={status === "loading"}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#173f31] px-5 py-4 text-sm font-bold text-white shadow-[0_12px_28px_rgba(23,63,49,0.2)] transition hover:bg-[#205541] focus:outline-none focus:ring-4 focus:ring-[#2f6c55]/20 disabled:cursor-wait disabled:opacity-65"
              >
                {status === "loading" ? (
                  <>
                    <span className="size-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                    분석 중…
                  </>
                ) : (
                  <>{mode === "mock" ? "Mock 분석 실행" : "Live 분석 실행"} <span aria-hidden="true">→</span></>
                )}
              </button>

              <p className="mt-3 text-center text-[11px] leading-5 text-[#7a857e]">
                Live 요청은 이 버튼을 누를 때만 실행됩니다. API 키는 브라우저로 전달되지 않습니다.
              </p>
            </form>

            <div aria-live="polite" aria-atomic="true">
              {visibleError && status === "error" ? (
                <div role="alert" className="rounded-2xl border border-[#cf6845]/25 bg-[#fff5ef] p-5 text-[#7c331f]">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-[#cf6845]/12 font-bold">!</span>
                    <div>
                      <p className="font-bold">분석을 완료하지 못했습니다.</p>
                      <p className="mt-1 text-sm leading-6 text-[#91452d]">{visibleError.message}</p>
                      {visibleError.code ? (
                        <p className="mt-2 font-mono text-[11px] text-[#a45b43]">{visibleError.code}</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}

              {result && status === "success" ? <AnalysisResult result={result} /> : null}
            </div>
          </div>
        </section>

        <footer className="flex flex-col gap-2 border-t border-[#17221c]/10 py-5 text-xs text-[#748078] sm:flex-row sm:items-center sm:justify-between">
          <span>Budget-aware recommended plan · not mathematical optimization</span>
          <span>GPT judgment ≠ deterministic cost calculation</span>
        </footer>
      </div>
    </main>
  );
}

function AnalysisResult({ result }: { result: AnalyzeSuccessResponse }) {
  const task = result.analysis.tasks[0];

  return (
    <section className="overflow-hidden rounded-[1.5rem] border border-[#173f31]/15 bg-[#173f31] text-white shadow-[0_20px_60px_rgba(23,63,49,0.2)]">
      <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#9ed0b8]">Analysis ready</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.025em]">구조화 분석 결과</h2>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="rounded-full bg-white/10 px-2.5 py-1 font-bold uppercase text-[#d7e9df]">{result.mode}</span>
          <span className="font-mono text-white/55">{result.model}</span>
        </div>
      </div>

      <div className="p-5 sm:p-7">
        <div className="rounded-2xl bg-white/[0.07] p-4 sm:p-5">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#9ed0b8]">Recommended tier</p>
          <div className="mt-2 flex items-end justify-between gap-4">
            <p className="text-3xl font-semibold capitalize tracking-[-0.03em]">{task.recommendedModelTier}</p>
            <span className="rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1 font-mono text-xs text-[#d9e7df]">
              {task.estimatedInputSize} → {task.estimatedOutputSize}
            </span>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-white/10 sm:grid-cols-4">
          {FIELD_LABELS.map(({ key, label }) => (
            <div key={key} className="bg-[#1d4939] p-3.5">
              <dt className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/45">{label}</dt>
              <dd className="mt-1.5 break-words text-sm font-semibold capitalize text-[#eef7f2]">
                {key === "expectedIterations" ? `${String(task[key])}회` : String(task[key])}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-5 grid gap-5 sm:grid-cols-[1.2fr_0.8fr]">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-[#9ed0b8]">판단 근거</h3>
            <p className="mt-2 text-sm leading-6 text-white/80">{task.rationale}</p>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-[#9ed0b8]">위험 요인</h3>
            {task.riskFactors.length ? (
              <ul className="mt-2 space-y-2 text-sm leading-5 text-white/75">
                {task.riskFactors.map((risk) => (
                  <li key={risk} className="flex gap-2">
                    <span className="text-[#e7ad83]">•</span>
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-white/55">명시된 위험 요인이 없습니다.</p>
            )}
          </div>
        </div>

        <p className="mt-6 border-t border-white/10 pt-4 text-[11px] leading-5 text-white/45">
          {new Date(result.generatedAt).toLocaleString("ko-KR")} · 비용과 최종 토큰 수는 이 단계에서 계산하지
          않습니다.
        </p>
      </div>
    </section>
  );
}
