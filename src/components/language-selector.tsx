"use client";

import { useLanguage } from "@/components/language-provider";
import { isUiLocale, UI_LOCALE_META, UI_LOCALES } from "@/lib/i18n/ui-copy";

export function LanguageSelector() {
  const { locale, copy, setLocale } = useLanguage();

  return (
    <div className="fixed bottom-3 right-3 z-[70] max-w-[calc(100vw-1.5rem)] rounded-2xl border border-[#173f31]/15 bg-white/95 p-2 shadow-[0_12px_32px_rgba(23,63,49,0.18)] backdrop-blur sm:bottom-4 sm:right-4">
      <label htmlFor="global-language-selector" className="flex min-w-0 items-center gap-2">
        <span className="shrink-0 pl-1 text-xs font-bold text-[#536159]">{copy.common.language}</span>
        <select
          id="global-language-selector"
          value={locale}
          onChange={(event) => {
            if (isUiLocale(event.target.value)) setLocale(event.target.value);
          }}
          aria-describedby="global-language-selector-help"
          className="min-h-11 min-w-0 max-w-36 rounded-xl border border-[#173f31]/15 bg-[#f7f9f5] px-3 py-2 text-base font-semibold text-[#294638] outline-none transition focus:border-[#2f6c55] focus:ring-4 focus:ring-[#2f6c55]/15"
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
