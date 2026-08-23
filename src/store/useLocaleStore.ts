'use client';
/**
 * Active UI language for the TopBar switcher (docs/roadmap.md F2.7). Every
 * consumer here is a client component, so a simple localStorage-persisted
 * store is enough — no server-rendered translated copy depends on it, unlike
 * useAuthStore's cookie storage which the middleware also has to read.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_LOCALE, type Locale } from '@/i18n/messages';

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: DEFAULT_LOCALE,
      setLocale: (locale) => set({ locale }),
    }),
    { name: 'flyworkflow-locale' },
  ),
);
