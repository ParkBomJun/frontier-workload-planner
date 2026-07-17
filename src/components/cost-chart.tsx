import type { PlannedTask } from "@/types/domain";

interface CostChartProps {
  tasks: PlannedTask[];
  formatCurrency: (value: number) => string;
}

export function CostChart({ tasks, formatCurrency }: CostChartProps) {
  const maximum = Math.max(...tasks.map((task) => task.cost.expected.costUsd), 0.000_001);

  return (
    <figure aria-labelledby="cost-chart-title" className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 sm:p-5">
      <figcaption id="cost-chart-title" className="text-sm font-bold text-[#d9ebe1]">
        작업별 Expected 비용
      </figcaption>
      <div className="mt-4 space-y-4">
        {tasks.map((task, index) => {
          const percentage = (task.cost.expected.costUsd / maximum) * 100;
          return (
            <div key={task.taskId} className="min-w-0">
              <div className="mb-1.5 flex min-w-0 items-center justify-between gap-3 text-xs">
                <span className="min-w-0 truncate text-white/75">
                  {String(index + 1).padStart(2, "0")} · {task.taskName}
                </span>
                <span className="shrink-0 font-mono font-bold text-[#b9ddc9]">
                  {formatCurrency(task.cost.expected.costUsd)}
                </span>
              </div>
              <div
                role="img"
                aria-label={`${task.taskName} Expected 비용 ${formatCurrency(task.cost.expected.costUsd)}`}
                className="h-2.5 overflow-hidden rounded-full bg-white/10"
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#79b797] to-[#e5a77d]"
                  style={{ width: `${Math.max(4, percentage)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </figure>
  );
}
