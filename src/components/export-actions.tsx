"use client";

import { useState } from "react";

import { createPlanJson } from "@/lib/export/json";
import { createPlanMarkdown } from "@/lib/export/markdown";
import type { PlanExportContext } from "@/types/domain";

interface ExportActionsProps {
  context: PlanExportContext;
}

type ExportStatus = "idle" | "copied" | "copy-error" | "json-ready" | "json-error";

async function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Clipboard copy was rejected.");
}

function exportFilename(timestamp: string): string {
  return `frontier-plan-${timestamp.replace(/[:.]/g, "-")}.json`;
}

export function ExportActions({ context }: ExportActionsProps) {
  const [status, setStatus] = useState<ExportStatus>("idle");

  async function copyMarkdown() {
    try {
      await copyText(createPlanMarkdown(context));
      setStatus("copied");
    } catch {
      setStatus("copy-error");
    }
  }

  function exportJson() {
    try {
      const exportedAt = new Date().toISOString();
      const blob = new Blob([createPlanJson(context, exportedAt)], {
        type: "application/json;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = exportFilename(exportedAt);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      setStatus("json-ready");
    } catch {
      setStatus("json-error");
    }
  }

  const statusMessage =
    status === "copied"
      ? "Markdown을 클립보드에 복사했습니다."
      : status === "copy-error"
        ? "Markdown 복사에 실패했습니다. 브라우저의 클립보드 권한을 확인해 주세요."
        : status === "json-ready"
          ? "JSON 내보내기를 준비했습니다."
          : status === "json-error"
            ? "JSON 내보내기에 실패했습니다."
            : "";

  return (
    <div className="sm:text-right">
      <div className="flex flex-wrap gap-2 sm:justify-end">
        <button
          type="button"
          onClick={copyMarkdown}
          className="min-h-11 rounded-xl border border-white/15 bg-white/[0.07] px-3.5 py-2 text-xs font-bold text-[#e4f2ea] transition hover:bg-white/[0.12] focus:outline-none focus-visible:ring-4 focus-visible:ring-white/15"
        >
          Markdown 복사
        </button>
        <button
          type="button"
          onClick={exportJson}
          className="min-h-11 rounded-xl bg-[#dcece3] px-3.5 py-2 text-xs font-bold text-[#173f31] transition hover:bg-white focus:outline-none focus-visible:ring-4 focus-visible:ring-white/20"
        >
          JSON 내보내기
        </button>
      </div>
      <p className="mt-2 text-xs leading-5 text-white/65">
        복사본과 JSON 파일에는 작업 설명이 포함됩니다.
      </p>
      <p className="mt-2 min-h-5 text-xs leading-5 text-white/60" aria-live="polite">
        {statusMessage}
      </p>
    </div>
  );
}
