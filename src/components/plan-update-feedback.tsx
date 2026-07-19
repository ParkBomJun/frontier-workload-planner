"use client";

import { useEffect } from "react";

import { planUpdateFeedbackDismissDelay } from "@/lib/planning/plan-update-feedback";

interface PlanUpdateFeedbackProps {
  message: string;
  pending: boolean;
  dismissLabel: string;
  onDismiss: () => void;
}

export function PlanUpdateFeedback({
  message,
  pending,
  dismissLabel,
  onDismiss,
}: PlanUpdateFeedbackProps) {
  useEffect(() => {
    const delay = planUpdateFeedbackDismissDelay(pending);
    if (delay === null) return;
    const timeout = window.setTimeout(onDismiss, delay);
    return () => window.clearTimeout(timeout);
  }, [onDismiss, pending]);

  return (
    <section
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-plan-update-feedback={pending ? "pending" : "complete"}
      className={`plan-update-feedback flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-sm text-white shadow-[0_18px_50px_rgba(13,40,30,0.3)] sm:px-5 ${
        pending
          ? "border-[#9a632c] bg-[#754317]"
          : "border-[#0f3025] bg-[#173f31]"
      }`}
    >
      <span
        aria-hidden="true"
        className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-white/15 text-xs font-black text-white"
      >
        {pending ? "!" : "✓"}
      </span>
      <p className="min-w-0 flex-1 leading-6">{message}</p>
      <button
        type="button"
        aria-label={dismissLabel}
        onClick={onDismiss}
        className="-mr-1 -mt-1 grid size-8 shrink-0 place-items-center rounded-full text-lg leading-none opacity-75 transition hover:bg-white/15 hover:opacity-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/35"
      >
        <span aria-hidden="true">×</span>
      </button>
    </section>
  );
}
