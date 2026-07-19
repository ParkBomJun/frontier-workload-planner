import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("source-level narrow multilingual layout contracts", () => {
  it("lets Japanese emergency wrap opportunities participate in min-content sizing", () => {
    const styles = readFileSync(`${process.cwd()}/src/app/globals.css`, "utf8");

    expect(styles).toMatch(
      /html:lang\(ja\) body \{[\s\S]*?word-break: auto-phrase;[\s\S]*?overflow-wrap: anywhere;[\s\S]*?\}/,
    );
  });

  it("keeps zero-minimum tracks and items in the planning form source", () => {
    const page = readFileSync(`${process.cwd()}/src/app/page.tsx`, "utf8");

    expect(page).toContain(
      'className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(330px,0.55fr)] xl:items-start"',
    );
    expect(page).toContain(
      'className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.55fr)] lg:items-center"',
    );
    expect(page).toMatch(
      /grid min-w-0 grid-cols-\[minmax\(0,1fr\)\] gap-4[\s\S]*?<div className="min-w-0">[\s\S]*?<div className="min-w-0">/,
    );
    expect(page).toContain(
      'className="mx-auto mt-3 max-w-lg whitespace-pre-line text-center text-xs leading-5 text-[#66736b]"',
    );
  });
});
