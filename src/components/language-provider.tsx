"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  DEFAULT_UI_LOCALE,
  getUiCopy,
  isUiLocale,
  UI_LOCALE_META,
  UI_LOCALE_STORAGE_KEY,
  type UiCopy,
  type UiLocale,
  type UiLocaleMeta,
} from "@/lib/i18n/ui-copy";

interface LanguageContextValue {
  locale: UiLocale;
  copy: UiCopy;
  localeMeta: UiLocaleMeta;
  setLocale: (locale: UiLocale) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readStoredLocale(): UiLocale | null {
  try {
    const stored = window.localStorage.getItem(UI_LOCALE_STORAGE_KEY);
    return isUiLocale(stored) ? stored : null;
  } catch {
    return null;
  }
}

function writeStoredLocale(locale: UiLocale): void {
  try {
    window.localStorage.setItem(UI_LOCALE_STORAGE_KEY, locale);
  } catch {
    // Language switching still works for this page view when storage is unavailable.
  }
}

export function LanguageProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [locale, setLocaleState] = useState<UiLocale>(DEFAULT_UI_LOCALE);

  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      const storedLocale = readStoredLocale();
      if (storedLocale) setLocaleState(storedLocale);
    }, 0);

    return () => window.clearTimeout(restoreTimer);
  }, []);

  useEffect(() => {
    document.documentElement.lang = UI_LOCALE_META[locale].htmlLang;
  }, [locale]);

  const setLocale = useCallback((nextLocale: UiLocale) => {
    setLocaleState(nextLocale);
    document.documentElement.lang = UI_LOCALE_META[nextLocale].htmlLang;
    writeStoredLocale(nextLocale);
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      locale,
      copy: getUiCopy(locale),
      localeMeta: UI_LOCALE_META[locale],
      setLocale,
    }),
    [locale, setLocale],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider.");
  }
  return context;
}
