import { PLANNING_STRATEGIES, type PlanningStrategy } from "@/types/domain";

export interface PlanningFormState {
  budgetUsd: string;
  deadlineDays: string;
  strategy: PlanningStrategy;
}

interface BudgetSettingsProps {
  value: PlanningFormState;
  disabled: boolean;
  showValidation: boolean;
  onChange: (value: PlanningFormState) => void;
}

const STRATEGY_CONTENT: Record<
  PlanningStrategy,
  { label: string; description: string }
> = {
  "cost-saver": {
    label: "비용 절감",
    description: "GPT 권장보다 한 등급 낮게 시작",
  },
  balanced: {
    label: "균형",
    description: "GPT 권장 등급을 기준으로 시작",
  },
  "quality-first": {
    label: "품질 우선",
    description: "GPT 권장보다 한 등급 높게 시작",
  },
};

export function BudgetSettings({
  value,
  disabled,
  showValidation,
  onChange,
}: BudgetSettingsProps) {
  const budget = Number(value.budgetUsd);
  const deadline = Number(value.deadlineDays);
  const budgetInvalid =
    showValidation && (!Number.isFinite(budget) || budget < 0.01 || budget > 10_000);
  const deadlineInvalid =
    showValidation || value.deadlineDays !== ""
      ? !Number.isInteger(deadline) || deadline < 1 || deadline > 90
      : false;

  return (
    <section className="rounded-[1.5rem] border border-[#173f31]/12 bg-white/90 p-5 shadow-[0_18px_50px_rgba(28,47,37,0.08)] sm:p-6">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#748078]">Plan controls</p>
      <h2 className="mt-1 text-xl font-semibold tracking-[-0.02em]">계획 설정</h2>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
        <label htmlFor="budget-usd" className="block">
          <span className="mb-2 block text-sm font-bold text-[#34443b]">전체 예산 (USD)</span>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-[#607067]">
              $
            </span>
            <input
              id="budget-usd"
              type="number"
              inputMode="decimal"
              min="0.01"
              max="10000"
              step="0.01"
              value={value.budgetUsd}
              onChange={(event) => onChange({ ...value, budgetUsd: event.target.value })}
              disabled={disabled}
              aria-invalid={budgetInvalid}
              aria-describedby={budgetInvalid ? "budget-usd-error" : "budget-usd-help"}
              className="w-full rounded-xl border border-[#173f31]/15 bg-[#fbfcf9] py-3 pl-8 pr-4 text-[15px] outline-none transition focus:border-[#2f6c55] focus:ring-4 focus:ring-[#2f6c55]/10 disabled:opacity-60 aria-[invalid=true]:border-[#c65f3d]"
            />
          </div>
          <span id="budget-usd-help" className="mt-1.5 block text-xs leading-5 text-[#68766e]">
            Expected 비용을 기준으로 등급을 조정합니다.
          </span>
          {budgetInvalid ? (
            <span id="budget-usd-error" className="mt-1 block text-sm text-[#a6452a]">
              $0.01~$10,000 사이의 예산을 입력해 주세요.
            </span>
          ) : null}
        </label>

        <label htmlFor="deadline-days" className="block">
          <span className="mb-2 block text-sm font-bold text-[#34443b]">검토 기한 (일)</span>
          <div className="relative">
            <input
              id="deadline-days"
              type="number"
              inputMode="numeric"
              min="1"
              max="90"
              step="1"
              value={value.deadlineDays}
              onChange={(event) => onChange({ ...value, deadlineDays: event.target.value })}
              disabled={disabled}
              aria-invalid={deadlineInvalid}
              aria-describedby={deadlineInvalid ? "deadline-days-error" : "deadline-days-help"}
              className="w-full rounded-xl border border-[#173f31]/15 bg-[#fbfcf9] px-4 py-3 pr-12 text-[15px] outline-none transition focus:border-[#2f6c55] focus:ring-4 focus:ring-[#2f6c55]/10 disabled:opacity-60 aria-[invalid=true]:border-[#c65f3d]"
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#607067]">
              일
            </span>
          </div>
          <span id="deadline-days-help" className="mt-1.5 block text-xs leading-5 text-[#68766e]">
            참고용입니다. 비용이나 등급을 임의로 바꾸지 않습니다.
          </span>
          {deadlineInvalid ? (
            <span id="deadline-days-error" className="mt-1 block text-sm text-[#a6452a]">
              1~90 사이의 정수를 입력해 주세요.
            </span>
          ) : null}
        </label>
      </div>

      <fieldset className="mt-5">
        <legend className="mb-2 text-sm font-bold text-[#34443b]">배분 전략</legend>
        <div className="space-y-2">
          {PLANNING_STRATEGIES.map((strategy) => {
            const content = STRATEGY_CONTENT[strategy];
            return (
              <label key={strategy} className="block cursor-pointer">
                <input
                  type="radio"
                  name="planning-strategy"
                  value={strategy}
                  checked={value.strategy === strategy}
                  onChange={() => onChange({ ...value, strategy })}
                  disabled={disabled}
                  className="peer sr-only"
                />
                <span className="block rounded-xl border border-[#173f31]/10 bg-[#f3f5f1] px-4 py-3 transition peer-checked:border-[#2f6c55]/30 peer-checked:bg-[#e8f0ea] peer-focus-visible:ring-4 peer-focus-visible:ring-[#2f6c55]/20">
                  <span className="block text-sm font-bold text-[#294638]">{content.label}</span>
                  <span className="mt-0.5 block text-xs leading-5 text-[#66736b]">
                    {content.description}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
    </section>
  );
}
