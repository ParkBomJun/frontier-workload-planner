"use client";

import { useLanguage } from "@/components/language-provider";
import { isUiLocale, UI_LOCALE_META, UI_LOCALES } from "@/lib/i18n/ui-copy";

export function LanguageSelector() {
  const { locale, copy, setLocale } = useLanguage();

  return (
    <div className="max-w-full rounded-xl border border-[#173f31]/15 bg-white/75 p-1 backdrop-blur">
      <label htmlFor="global-language-selector" className="flex min-w-0 items-center gap-2">
        <span className="sr-only">{copy.common.language}</span>
        <select
          id="global-language-selector"
          value={locale}
          onChange={(event) => {
            if (isUiLocale(event.target.value)) setLocale(event.target.value);
          }}
          aria-describedby="global-language-selector-help"
          className="min-h-11 min-w-0 max-w-32 rounded-lg border-0 bg-transparent px-2.5 py-1.5 text-sm font-semibold text-[#294638] outline-none transition focus:ring-4 focus:ring-[#2f6c55]/15"
        >
          {UI_LOCALES.map((optionLocale) => (
            <option key={optionLocale} value={optionLocale} lang={UI_LOCALE_META[optionLocale].htmlLang}>
              {UI_LOCALE_META[optionLocale].nativeName}
            </option>
          ))}
        </select>
      </label>
      <span id="global-language-selector-help" className="sr-only">
        {copy.common.languageSelectorHelp}
      </span>
    </div>
  );
}
