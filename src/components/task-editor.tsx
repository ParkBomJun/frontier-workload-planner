"use client";

import { useLanguage } from "@/components/language-provider";
import {
  MAX_TASK_DESCRIPTION_LENGTH,
  MAX_TASK_NAME_LENGTH,
  MAX_TASKS,
} from "@/lib/ai/schema";
import type { TaskInput, TaskPriority } from "@/types/domain";
import type { FailureImpact } from "@/types/workload";

interface TaskEditorProps {
  tasks: TaskInput[];
  disabled: boolean;
  showValidation: boolean;
  onAdd: () => void;
  onRemove: (taskId: string) => void;
  onChange: (taskId: string, field: "name" | "description", value: string) => void;
  onPriorityChange: (taskId: string, priority: TaskPriority) => void;
  onDeadlineChange: (taskId: string, deadlineDate: string | null) => void;
  onFailureImpactChange: (taskId: string, failureImpact: FailureImpact) => void;
  onLoadSample: () => void;
}

export function TaskEditor({
  tasks,
  disabled,
  showValidation,
  onAdd,
  onRemove,
  onChange,
  onPriorityChange,
  onDeadlineChange,
  onFailureImpactChange,
  onLoadSample,
}: TaskEditorProps) {
  const { copy } = useLanguage();
  const taskCopy = copy.taskEditor;

  return (
    <section className="min-w-0 rounded-[1.75rem] border border-white/80 bg-white/90 p-5 shadow-[0_24px_70px_rgba(28,47,37,0.1)] backdrop-blur sm:p-7">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#748078]">{taskCopy.eyebrow}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.025em]">{taskCopy.title}</h2>
          <p className="mt-1 text-sm text-[#66736b]">{taskCopy.maxTasksHelp(MAX_TASKS)}</p>
          <p id="task-priority-help" className="mt-1 text-xs leading-5 text-[#66736b]">
            {taskCopy.priorityHelp}
          </p>
        </div>
        <button
          type="button"
          onClick={onLoadSample}
          disabled={disabled}
          className="rounded-full border border-[#173f31]/15 px-3.5 py-2 text-sm font-bold text-[#365649] transition hover:border-[#173f31]/35 hover:bg-[#edf3ee] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2f6c55]/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {taskCopy.loadSample(3)}
        </button>
      </div>

      <div className="space-y-4">
        {tasks.map((task, index) => {
          const nameInvalid = showValidation && !task.name.trim();
          const descriptionInvalid = showValidation && !task.description.trim();
          const nameId = `task-name-${task.id}`;
          const descriptionId = `task-description-${task.id}`;
          const nameErrorId = `${nameId}-error`;
          const descriptionErrorId = `${descriptionId}-error`;

          return (
            <fieldset
              key={task.id}
              className="min-w-0 rounded-2xl border border-[#173f31]/12 bg-[#fbfcf9] p-4 sm:p-5"
            >
              <legend className="sr-only">{taskCopy.taskLegend(index + 1)}</legend>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid size-8 place-items-center rounded-lg bg-[#e8eee8] font-mono text-xs font-bold text-[#2e5a47]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <p className="font-semibold text-[#263c32]">{taskCopy.taskLabel(index + 1)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(task.id)}
                  disabled={disabled || tasks.length === 1}
                  aria-label={taskCopy.removeAriaLabel(
                    task.name.trim() || taskCopy.taskLabel(index + 1),
                  )}
                  className="min-h-11 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-[#8a5a48] transition hover:bg-[#fff0e8] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#c66845]/20 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  {taskCopy.remove}
                </button>
              </div>

              <div className="grid min-w-0 gap-4">
                <label htmlFor={nameId} className="block min-w-0">
                  <span className="mb-2 flex items-center justify-between gap-3 text-sm font-bold text-[#34443b]">
                    <span>{taskCopy.nameLabel}</span>
                    <span className="font-mono text-xs font-normal text-[#6f7d75]">
                      {taskCopy.characterCounter(task.name.length, MAX_TASK_NAME_LENGTH)}
                    </span>
                  </span>
                  <input
                    id={nameId}
                    value={task.name}
                    onChange={(event) => onChange(task.id, "name", event.target.value)}
                    maxLength={MAX_TASK_NAME_LENGTH}
                    disabled={disabled}
                    aria-invalid={nameInvalid}
                    aria-describedby={nameInvalid ? nameErrorId : undefined}
                    placeholder={taskCopy.namePlaceholder}
                    className="w-full min-w-0 rounded-xl border border-[#173f31]/15 bg-white px-4 py-3 text-base outline-none transition placeholder:text-[#8b9890] focus:border-[#2f6c55] focus:ring-4 focus:ring-[#2f6c55]/10 disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-[#c65f3d]"
                  />
                  {nameInvalid ? (
                    <span id={nameErrorId} className="mt-1.5 block text-sm text-[#a6452a]">
                      {taskCopy.nameRequired}
                    </span>
                  ) : null}
                </label>

                <div className="grid min-w-0 gap-4 sm:grid-cols-3">
                  <label htmlFor={`task-priority-${task.id}`} className="block min-w-0">
                    <span className="mb-2 block text-sm font-bold text-[#34443b]">{taskCopy.priorityLabel}</span>
                    <select
                      id={`task-priority-${task.id}`}
                      value={task.priority}
                      onChange={(event) =>
                        onPriorityChange(task.id, event.target.value as TaskPriority)
                      }
                      disabled={disabled}
                      aria-describedby="task-priority-help"
                      className="min-h-11 w-full rounded-xl border border-[#173f31]/15 bg-white px-3 py-2.5 text-base font-semibold text-[#34443b] outline-none transition focus:border-[#2f6c55] focus:ring-4 focus:ring-[#2f6c55]/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <option value="high">{copy.enums.priority.high}</option>
                      <option value="medium">{copy.enums.priority.medium}</option>
                      <option value="low">{copy.enums.priority.low}</option>
                    </select>
                  </label>

                  <label htmlFor={`task-deadline-${task.id}`} className="block min-w-0">
                    <span className="mb-2 block text-sm font-bold text-[#34443b]">{taskCopy.deadlineLabel}</span>
                    <input
                      id={`task-deadline-${task.id}`}
                      type="date"
                      value={task.deadlineDate ?? ""}
                      onChange={(event) =>
                        onDeadlineChange(task.id, event.target.value || null)
                      }
                      disabled={disabled}
                      aria-describedby={`task-deadline-help-${task.id}`}
                      className="min-h-11 w-full rounded-xl border border-[#173f31]/15 bg-white px-3 py-2.5 text-base text-[#34443b] outline-none transition focus:border-[#2f6c55] focus:ring-4 focus:ring-[#2f6c55]/10 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                    <span
                      id={`task-deadline-help-${task.id}`}
                      className="mt-1.5 block text-xs leading-5 text-[#68766e]"
                    >
                      {taskCopy.deadlineHelp}
                    </span>
                  </label>

                  <label htmlFor={`task-failure-impact-${task.id}`} className="block min-w-0">
                    <span className="mb-2 block text-sm font-bold text-[#34443b]">{taskCopy.failureImpactLabel}</span>
                    <select
                      id={`task-failure-impact-${task.id}`}
                      value={task.failureImpact}
                      onChange={(event) =>
                        onFailureImpactChange(task.id, event.target.value as FailureImpact)
                      }
                      disabled={disabled}
                      aria-describedby={`task-failure-impact-help-${task.id}`}
                      className="min-h-11 w-full rounded-xl border border-[#173f31]/15 bg-white px-3 py-2.5 text-base font-semibold text-[#34443b] outline-none transition focus:border-[#2f6c55] focus:ring-4 focus:ring-[#2f6c55]/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <option value="high">{copy.enums.failureImpact.high}</option>
                      <option value="medium">{copy.enums.failureImpact.medium}</option>
                      <option value="low">{copy.enums.failureImpact.low}</option>
                      <option value="unspecified">{copy.enums.failureImpact.unspecified}</option>
                    </select>
                    <span
                      id={`task-failure-impact-help-${task.id}`}
                      className="mt-1.5 block text-xs leading-5 text-[#68766e]"
                    >
                      {taskCopy.failureImpactHelp}
                    </span>
                  </label>
                </div>

                <label htmlFor={descriptionId} className="block min-w-0">
                  <span className="mb-2 flex items-center justify-between gap-3 text-sm font-bold text-[#34443b]">
                    <span>{taskCopy.descriptionLabel}</span>
                    <span className="font-mono text-xs font-normal text-[#6f7d75]">
                      {taskCopy.characterCounter(task.description.length, MAX_TASK_DESCRIPTION_LENGTH)}
                    </span>
                  </span>
                  <textarea
                    id={descriptionId}
                    value={task.description}
                    onChange={(event) => onChange(task.id, "description", event.target.value)}
                    maxLength={MAX_TASK_DESCRIPTION_LENGTH}
                    disabled={disabled}
                    aria-invalid={descriptionInvalid}
                    aria-describedby={descriptionInvalid ? descriptionErrorId : undefined}
                    rows={4}
                    placeholder={taskCopy.descriptionPlaceholder}
                    className="w-full min-w-0 resize-y rounded-xl border border-[#173f31]/15 bg-white px-4 py-3 text-base leading-6 outline-none transition placeholder:text-[#8b9890] focus:border-[#2f6c55] focus:ring-4 focus:ring-[#2f6c55]/10 disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-[#c65f3d]"
                  />
                  {descriptionInvalid ? (
                    <span id={descriptionErrorId} className="mt-1.5 block text-sm text-[#a6452a]">
                      {taskCopy.descriptionRequired}
                    </span>
                  ) : null}
                </label>
              </div>
            </fieldset>
          );
        })}
      </div>

      <button
        id="add-task-button"
        type="button"
        onClick={onAdd}
        disabled={disabled || tasks.length >= MAX_TASKS}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#2f6c55]/30 bg-[#f4f8f4] px-4 py-3 text-sm font-bold text-[#365f4d] transition hover:border-[#2f6c55]/55 hover:bg-[#eaf2ec] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2f6c55]/15 disabled:cursor-not-allowed disabled:opacity-45"
      >
        <span aria-hidden="true">＋</span>
        {tasks.length >= MAX_TASKS ? taskCopy.maximumReached(MAX_TASKS) : taskCopy.addTask}
      </button>
    </section>
  );
}
