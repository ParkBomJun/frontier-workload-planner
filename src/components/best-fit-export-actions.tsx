"use client";

import { useState } from "react";

import { useLanguage } from "@/components/language-provider";
import {
  createBestFitPlanJson,
  type BestFitPlanExportContext,
} from "@/lib/export/best-fit";
import { createBestFitPlanMarkdown } from "@/lib/export/best-fit-markdown";
import { BEST_FIT_UI_COPY } from "@/lib/i18n/best-fit-ui-copy";

interface BestFitExportActionsProps {
  context: BestFitPlanExportContext;
}

type ExportStatus = "copied" | "copy-error" | "json-ready" | "json-error";

interface ExportFeedback {
  status: ExportStatus;
  plan: BestFitPlanExportContext["uiPlan"]["plan"];
  sourceState: BestFitPlanExportContext["sourceState"];
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
  return `frontier-work-plan-${timestamp.replace(/[:.]/g, "-")}.json`;
}

export function BestFitExportActions({ context }: BestFitExportActionsProps) {
  const { copy, locale } = useLanguage();
  const bestFitCopy = BEST_FIT_UI_COPY[locale];
  const [feedback, setFeedback] = useState<ExportFeedback | null>(null);

  async function copyMarkdown() {
    const { plan } = context.uiPlan;
    const { sourceState, generatedAt } = context;
    try {
      await copyText(createBestFitPlanMarkdown(context, locale));
      setFeedback({ status: "copied", plan, sourceState, generatedAt });
    } catch {
      setFeedback({ status: "copy-error", plan, sourceState, generatedAt });
    }
  }

  function exportJson() {
    const { plan } = context.uiPlan;
    const { sourceState, generatedAt } = context;
    try {
      const exportedAt = new Date().toISOString();
      const blob = new Blob([createBestFitPlanJson(context, exportedAt)], {
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
      setFeedback({ status: "json-ready", plan, sourceState, generatedAt });
    } catch {
      setFeedback({ status: "json-error", plan, sourceState, generatedAt });
    }
  }

  const status =
    feedback?.plan === context.uiPlan.plan &&
    feedback.sourceState === context.sourceState &&
    feedback.generatedAt === context.generatedAt
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
    <div className="min-w-0 sm:max-w-md sm:text-right">
      <div className="flex flex-wrap gap-2 sm:justify-end">
        <button
          type="button"
          onClick={copyMarkdown}
          className="min-h-11 rounded-xl border border-[#173f31]/15 bg-white px-3.5 py-2 text-xs font-bold text-[#365649] transition hover:bg-[#edf4ee] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2f6c55]/15"
        >
          {copy.export.copyMarkdown}
        </button>
        <button
          type="button"
          onClick={exportJson}
          className="min-h-11 rounded-xl bg-[#173f31] px-3.5 py-2 text-xs font-bold text-white transition hover:bg-[#205541] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2f6c55]/20"
        >
          {copy.export.exportJson}
        </button>
      </div>
      <p className="mt-2 text-xs leading-5 text-[#607067]">
        {bestFitCopy.results.exportDisclosure}
      </p>
      <p
        className="mt-2 min-h-5 text-xs leading-5 text-[#607067]"
        aria-live="polite"
      >
        {statusMessage}
      </p>
    </div>
  );
}
