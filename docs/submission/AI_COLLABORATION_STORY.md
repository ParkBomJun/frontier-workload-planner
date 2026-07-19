# Nothing More — AI collaboration record

> **Status:** AI-authored and human-reviewed.<br>
> The official personal account is the maker's [human-written Korean retrospective](./HUMAN_RETROSPECTIVE_KO.md). This document is a code-grounded summary of the collaboration, not a replacement for the maker's voice.

## One product, two distinct roles

The maker supplied the problem, used the product as an individual user, challenged confusing assumptions, chose the product name and audience, and decided what counted as an acceptable experience. Codex investigated unfamiliar product details, translated those decisions into code, and repeatedly tested the result.

The project did not improve because AI produced one large answer. It improved because the maker kept trying the app, showing what felt wrong, and asking for another pass.

| The maker owned | Codex contributed |
| --- | --- |
| Problem, target user, name, scope, privacy threshold, UX direction, final acceptance | Research, implementation alternatives, code changes, regression tests, localization, build and browser checks |
| Lived experience and product judgment | Fast iteration and explicit technical evidence |
| Final meaning of the product | A reviewable implementation of that meaning |

## Feedback that changed the product

The Korean excerpts below come from the maker's feedback during development. Spacing and spelling are lightly normalized. Where one line combines several related messages, it is explicitly labeled as paraphrased. English translations and the summaries are AI-authored.

### 1. Replace internal jargon with user language

> “Best-fit이라고 적어두면 우리는 알아도 사용자는 모를 수 있어.”<br>
> “We may understand ‘Best-fit,’ but a user might not.”

The default flow stopped leading with `Best-fit`, `Mock`, `Live`, and `override`. It now uses labels such as **맞춤 작업 계획** (tailored work plan), **예시로 먼저 보기** (try a sample first), **내 작업 분석** (analyze my tasks), and **고급 설정 · 선택** (advanced settings · optional). Price overrides remain available, but behind an optional expert control.

**User value:** A first-time visitor can distinguish the sample and personal-analysis paths without knowing implementation vocabulary.

**Evidence:** [TASKS.md](../../TASKS.md), [UI copy](../../src/lib/i18n/ui-copy.ts), [result copy](../../src/lib/i18n/best-fit-ui-copy.ts)

### 2. Rebuild the page around the user's action order

> “페이지 자체가 너무 긴 것 같기도 해. 사용자가 ‘밑에도 있었네?’ 할 수도 있을 것 같거든.”<br>
> “The page feels too long. A user might only later realize that there was more below.”

Tasks and compact budget choices now form the first input row. Optional subscriptions follow, and one full-width plan action comes after every input it uses. Advanced API price editing is collapsed by default, and conditional details appear inside the relevant resource card instead of creating another distant section.

**User value:** The desktop gap is smaller, the input order is easier to follow, and optional expert tools no longer dominate the first experience.

**Honest boundary:** Adding many resources or expanding diagnostics can still make the page long; the change improves hierarchy rather than pretending all complexity disappeared.

**Evidence:** [UX decisions](../../DECISIONS.md), [page flow](../../src/app/page.tsx), [catalog override editor](../../src/components/catalog-override-editor.tsx)

### 3. Turn a dead end into a next step

> **Paraphrased from related feedback:** 무언가가 비어 있어서 안 된다면 “이거 때문에 안 됩니다”라고 알려주고, 자동으로 수정할 부분으로 이동시켜 줄 수 없을까?<br>
> “If something is missing, can the app say what is blocking it and take the user to the part that needs fixing?”

Blocking input problems are shown with human-readable field labels. The primary recovery action scrolls the first problem into view and moves keyboard focus there. Provider-evidence diagnostics remain available as secondary detail instead of replacing the actionable explanation.

**User value:** The user does not have to search a long page after being told only that the plan failed.

**Evidence:** [blocking dialog](../../src/components/blocking-issues-dialog.tsx), [focus routing](../../src/app/page.tsx), [dialog regression test](../../tests/blocking-issues-dialog.test.tsx)

### 4. Record the limits people can actually see

> “현재 5시간 몇 %, 주간 몇 % 남았는지 슬라이더처럼 기록할 수 있으면 좋겠어.”<br>
> “It would be better if I could record how much of the five-hour and weekly limits remain, using something like sliders.”

One account card can record separate five-hour, weekly, model-weekly, daily, and included-credit percentages. The result repeats those observations and treats the lowest remaining percentage as a reference warning. It does not split concurrent limits on one account into fake independent resources.

**User value:** A person can copy what an official product screen shows without inventing exact credits or task capacity.

**Honest boundary:** A percentage is a snapshot, not verified capacity or an exact number of tasks. It does not become authoritative subscription evidence.

**Evidence:** [usage snapshots](../../src/lib/subscriptions/usage-snapshot.ts), [resource editor](../../src/components/available-ai-resources.tsx), [result presentation](../../src/components/best-fit-results.tsx)

### 5. Treat privacy as a product boundary, not a footnote

> “API 기능 자체가 없어야 할 수도 있잖아. 서버에 저장하지 않더라도 이런 부분은 더 신중해야 해.”<br>
> “Maybe the API feature should not be available at all. Even if the server does not store it, we need to be more careful here.”

The public-release policy requires unauthenticated Live analysis to remain disabled, while the deterministic sample stays usable in the browser; the final deployment checklist must verify that boundary on the exact release commit. When a private operator explicitly enables Live analysis, the key remains in the server environment and only task ID, name, and description are allowlisted for the OpenAI request. The request uses `store:false`, while the UI and documentation still disclose that this is not zero retention. Browser plaintext storage and deletion are also disclosed.

Executable tests check the outbound allowlist, server-side key boundary, fail-closed feature gate, `store:false`, and raw-error containment. A Content Security Policy limits browser connections to the same origin.

**User value:** The sample path is designed so judges can try the planner without exposing a paid unauthenticated endpoint, while the optional Live path has inspectable boundaries rather than a broad “safe” claim.

**Honest boundary:** Mocked regression tests do not prove provider availability, zero retention, or confidential-work suitability.

**Evidence:** [privacy data flow](./PRIVACY_DATA_FLOW.md), [analysis privacy test](../../tests/analyze-tasks-privacy.test.ts), [route privacy test](../../tests/live-analyze-route.test.ts), [security headers](../../next.config.ts)

### 6. Design for a phone and for a short window

> “모바일 부근도 신경써야 하는 거 알지?”<br>
> “You know the mobile experience matters too, right?”

> “창 화면이면 알림이 밑으로 잘려서 못 봤던 거였네.”<br>
> “I found the problem: in a window instead of full screen, the notice was cut off below.”

Inputs and results collapse to one column at narrow widths. Dialogs stay within viewport bounds and scroll internally. Plan-update feedback appears near the top on wide screens and above the mobile safe area on narrow screens, with bounded height for short windows.

**User value:** A phone or smaller desktop window still exposes the close, recovery, and recalculation controls.

**Evidence:** [responsive page](../../src/app/page.tsx), [dialog layout](../../src/components/blocking-issues-dialog.tsx), [feedback component](../../src/components/plan-update-feedback.tsx), [global styles](../../src/app/globals.css)

### 7. Make recalculation visible even when the answer stays the same

> “효과가 없다 보니 이게 정상적으로 수정된 건지 무반응인 건지 헷갈렸을 수도 있어.”<br>
> “Without any feedback, I may have confused a successful recalculation with no response at all.”

Changing the budget revokes its meaning confirmation until the user confirms it again. Planning-only changes reuse the bounded workload analysis and report whether the displayed route or cost changed or whether recalculation completed with the same result. Changing task names, descriptions, or list membership requires a new sample or Live analysis instead of silently reusing an outdated classification.

**User value:** An unchanged answer no longer looks like a broken button, and a changed task cannot quietly inherit stale analysis.

**Evidence:** [recalculation decision](../../DECISIONS.md), [feedback component](../../src/components/plan-update-feedback.tsx), [localized feedback copy](../../src/lib/i18n/ui-copy.ts)

## What changed because a human stayed involved

Codex could implement a contract, apply a layout, and run a test suite quickly. It could not decide on its own when a technically accurate term felt alienating, when a gap made the page look unfinished, or when an “accurate” diagnostic left a person with no idea what to do next.

The maker repeatedly supplied that missing judgment by becoming the user. The result is still a strict planner: uncertain access remains uncertain, subscription percentages do not become invented capacity, and financial choices remain deterministic. What changed is how the product carries that strictness. It now explains the boundary and shows the next action.

That is the central collaboration story behind Nothing More: **AI supplied speed and implementation; the human supplied direction, lived experience, and the meaning of “usable.”**
