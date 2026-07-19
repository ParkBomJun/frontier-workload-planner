"use client";

import { useEffect, useId, useRef } from "react";

interface BlockingIssuesDialogProps {
  open: boolean;
  title: string;
  description: string;
  issues: readonly string[];
  closeLabel: string;
  focusAfterClose?: string;
  onClose: () => void;
}

export function BlockingIssuesDialog({
  open,
  title,
  description,
  issues,
  closeLabel,
  focusAfterClose,
  onClose,
}: BlockingIssuesDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const dialogId = useId();
  const titleId = `${dialogId}-title`;
  const descriptionId = `${dialogId}-description`;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      returnFocusRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  function closeDialog() {
    dialogRef.current?.close();
  }

  return (
    <dialog
      ref={dialogRef}
      id={dialogId}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        closeDialog();
      }}
      onClose={() => {
        onClose();
        const focusTarget = focusAfterClose
          ? document.querySelector<HTMLElement>(focusAfterClose)
          : returnFocusRef.current;
        if (focusTarget) {
          requestAnimationFrame(() => {
            const reduceMotion = window.matchMedia?.(
              "(prefers-reduced-motion: reduce)",
            ).matches;
            focusTarget.scrollIntoView({
              behavior: reduceMotion ? "auto" : "smooth",
              block: "center",
            });
            focusTarget.focus({ preventScroll: true });
          });
        }
        returnFocusRef.current = null;
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) closeDialog();
      }}
      className="m-auto max-h-[min(84dvh,38rem)] w-[min(92vw,34rem)] overflow-y-auto rounded-[1.5rem] border border-[#173f31]/15 bg-white p-0 text-[#17352a] shadow-[0_28px_90px_rgba(17,42,31,0.3)] backdrop:bg-[#132e24]/40 backdrop:backdrop-blur-[2px]"
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="break-words text-xl font-semibold tracking-[-0.02em]"
            >
              {title}
            </h2>
            <p id={descriptionId} className="mt-2 text-sm leading-6 text-[#607067]">
              {description}
            </p>
          </div>
          <button
            type="button"
            onClick={closeDialog}
            aria-label={closeLabel}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-[#173f31]/12 text-xl leading-none text-[#52645a] transition hover:bg-[#edf3ef] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2f6c55]/15"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <ul className="mt-5 list-disc space-y-2 rounded-2xl border border-[#cf6845]/20 bg-[#fff2eb] py-4 pl-9 pr-4 text-sm leading-6 text-[#7c331f]">
          {issues.map((issue, index) => (
            <li key={`${index}:${issue}`}>{issue}</li>
          ))}
        </ul>

        <button
          type="button"
          onClick={closeDialog}
          className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#164a38] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#103d2e] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2f6c55]/20"
        >
          {closeLabel}
        </button>
      </div>
    </dialog>
  );
}
