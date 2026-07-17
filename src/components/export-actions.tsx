"use client";

import { useState } from "react";

import { createPlanJson } from "@/lib/export/json";
import { createPlanMarkdown } from "@/lib/export/markdown";
import type { PlanExportContext } from "@/types/domain";

import { useLanguage } from "./language-provider";

interface ExportActionsProps {
  context: PlanExportContext;
}

type ExportStatus = "copied" | "copy-error" | "json-ready" | "json-error";

interface ExportFeedback {
  status: ExportStatus;
  plan: PlanExportContext["plan"];
  generatedAt: string;
}

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
  const { copy, locale } = useLanguage();
  const [feedback, setFeedback] = useState<ExportFeedback | null>(null);

  async function copyMarkdown() {
    const plan = context.plan;
    const generatedAt = context.generatedAt;
    try {
      await copyText(createPlanMarkdown(context, locale));
      setFeedback({ status: "copied", plan, generatedAt });
    } catch {
      setFeedback({ status: "copy-error", plan, generatedAt });
    }
  }

  function exportJson() {
    const plan = context.plan;
    const generatedAt = context.generatedAt;
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
      setFeedback({ status: "json-ready", plan, generatedAt });
    } catch {
      setFeedback({ status: "json-error", plan, generatedAt });
    }
  }

  const status =
    feedback?.plan === context.plan && feedback.generatedAt === context.generatedAt
      ? feedback.status
      : null;

  const statusMessage =
    status === "copied"
      ? copy.export.markdownCopied
      : status === "copy-error"
        ? copy.export.markdownCopyFailed
        : status === "json-ready"
          ? copy.export.jsonReady
          : status === "json-error"
            ? copy.export.jsonFailed
            : "";

  return (
    <div className="sm:text-right">
      <div className="flex flex-wrap gap-2 sm:justify-end">
        <button
          type="button"
          onClick={copyMarkdown}
          className="min-h-11 rounded-xl border border-white/15 bg-white/[0.07] px-3.5 py-2 text-xs font-bold text-[#e4f2ea] transition hover:bg-white/[0.12] focus:outline-none focus-visible:ring-4 focus-visible:ring-white/15"
        >
          {copy.export.copyMarkdown}
        </button>
        <button
          type="button"
          onClick={exportJson}
          className="min-h-11 rounded-xl bg-[#dcece3] px-3.5 py-2 text-xs font-bold text-[#173f31] transition hover:bg-white focus:outline-none focus-visible:ring-4 focus-visible:ring-white/20"
        >
          {copy.export.exportJson}
        </button>
      </div>
      <p className="mt-2 text-xs leading-5 text-white/65">
        {copy.export.includesDescriptions}
      </p>
      <p className="mt-2 min-h-5 text-xs leading-5 text-white/60" aria-live="polite">
        {statusMessage}
      </p>
    </div>
  );
}
