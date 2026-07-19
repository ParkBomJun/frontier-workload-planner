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
      className={`plan-update-feedback flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-sm shadow-[0_12px_30px_rgba(28,47,37,0.16)] sm:px-5 ${
        pending
          ? "border-[#c88743]/25 bg-[#fff8ec] text-[#71491f]"
          : "border-[#2f6c55]/20 bg-[#edf5ef] text-[#274d3d]"
      }`}
    >
      <span
        aria-hidden="true"
        className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-xs font-black ${
          pending
            ? "bg-[#f4dfbd] text-[#71491f]"
            : "bg-[#cfe4d5] text-[#20503d]"
        }`}
      >
        {pending ? "!" : "✓"}
      </span>
      <p className="min-w-0 flex-1 leading-6">{message}</p>
      <button
        type="button"
        aria-label={dismissLabel}
        onClick={onDismiss}
        className="-mr-1 -mt-1 grid size-8 shrink-0 place-items-center rounded-full text-lg leading-none opacity-65 transition hover:bg-black/5 hover:opacity-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-current/15"
      >
        <span aria-hidden="true">×</span>
      </button>
    </section>
  );
}
