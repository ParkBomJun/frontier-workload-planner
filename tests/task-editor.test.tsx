import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LanguageProvider } from "@/components/language-provider";
import { TaskEditor } from "@/components/task-editor";
import { UI_COPY } from "@/lib/i18n/ui-copy";

describe("Personal-user task editor", () => {
  it("labels required, optional, and defaulted fields accessibly", () => {
    const markup = renderToStaticMarkup(
      createElement(
        LanguageProvider,
        null,
        createElement(TaskEditor, {
          tasks: [
            {
              id: "task-1",
              name: "",
              description: "",
              priority: "medium",
              deadlineDate: null,
              failureImpact: "medium",
            },
          ],
          disabled: false,
          showValidation: false,
          onAdd: () => undefined,
          onRemove: () => undefined,
          onChange: () => undefined,
          onPriorityChange: () => undefined,
          onDeadlineChange: () => undefined,
          onFailureImpactChange: () => undefined,
          onLoadSample: () => undefined,
        }),
      ),
    );
    const common = UI_COPY.ko.common;
    const nameLabel = markup.match(
      /<label for="task-name-task-1"[\s\S]*?<\/label>/,
    )?.[0] ?? "";
    const priorityLabel = markup.match(
      /<label for="task-priority-task-1"[\s\S]*?<\/label>/,
    )?.[0] ?? "";
    const deadlineLabel = markup.match(
      /<label for="task-deadline-task-1"[\s\S]*?<\/label>/,
    )?.[0] ?? "";
    const failureImpactLabel = markup.match(
      /<label for="task-failure-impact-task-1"[\s\S]*?<\/label>/,
    )?.[0] ?? "";
    const descriptionLabel = markup.match(
      /<label for="task-description-task-1"[\s\S]*?<\/label>/,
    )?.[0] ?? "";
    const nameInput = markup.match(/<input id="task-name-task-1"[^>]*>/)?.[0] ?? "";
    const prioritySelect = markup.match(
      /<select id="task-priority-task-1"[^>]*>/,
    )?.[0] ?? "";
    const deadlineInput = markup.match(
      /<input id="task-deadline-task-1"[^>]*>/,
    )?.[0] ?? "";
    const failureImpactSelect = markup.match(
      /<select id="task-failure-impact-task-1"[^>]*>/,
    )?.[0] ?? "";
    const descriptionInput = markup.match(
      /<textarea id="task-description-task-1"[^>]*>/,
    )?.[0] ?? "";

    expect(nameLabel).toContain(common.required);
    expect(descriptionLabel).toContain(common.required);
    expect(priorityLabel).toContain(common.optional);
    expect(priorityLabel).toContain(common.defaultValue);
    expect(deadlineLabel).toContain(common.optional);
    expect(deadlineLabel).not.toContain(common.defaultValue);
    expect(failureImpactLabel).toContain(common.optional);
    expect(failureImpactLabel).toContain(common.defaultValue);
    expect(nameInput).toContain('required=""');
    expect(descriptionInput).toContain('required=""');
    expect(prioritySelect).not.toContain("required");
    expect(deadlineInput).not.toContain("required");
    expect(failureImpactSelect).not.toContain("required");
  });

  it("keeps the meaning of priority, deadline, and failure impact visible", () => {
    const markup = renderToStaticMarkup(
      createElement(
        LanguageProvider,
        null,
        createElement(TaskEditor, {
          tasks: [
            {
              id: "task-1",
              name: "",
              description: "",
              priority: "medium",
              deadlineDate: null,
              failureImpact: "medium",
            },
          ],
          disabled: false,
          showValidation: false,
          onAdd: () => undefined,
          onRemove: () => undefined,
          onChange: () => undefined,
          onPriorityChange: () => undefined,
          onDeadlineChange: () => undefined,
          onFailureImpactChange: () => undefined,
          onLoadSample: () => undefined,
        }),
      ),
    );

    expect(markup).toContain(UI_COPY.ko.taskEditor.settingsHelp);
    expect(markup).not.toContain(
      `class="sr-only">${UI_COPY.ko.taskEditor.settingsHelp}`,
    );
  });
});
