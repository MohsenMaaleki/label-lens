import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useArabicFonts } from './fonts';
import { isRTL, strings, type Strings } from './i18n';
import { fontsFor, type Fonts } from './theme';

export interface LangValue {
  lang: string;
  t: Strings;
  rtl: boolean;
  f: Fonts;
  /** Vazirmatn has loaded; text in Persian, Arabic or Urdu uses it from then on. */
  arabicReady: boolean;
}

function make(lang: string, arabicReady: boolean): LangValue {
  return { lang, t: strings(lang), rtl: isRTL(lang), f: fontsFor(lang, arabicReady), arabicReady };
}

const LangContext = createContext<LangValue>(make('en', false));

export function LangProvider({ lang, children }: { lang: string; children: ReactNode }) {
  // Re-renders the text when Vazirmatn arrives, so Arabic-script text leaves the system font.
  const arabicReady = useArabicFonts() === 'ready';
  const value = useMemo(() => make(lang, arabicReady), [lang, arabicReady]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
