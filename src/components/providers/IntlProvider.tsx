'use client';
/**
 * Mounts next-intl at the root so every client component can call
 * `useTranslations()`. Locale comes from {@link useLocaleStore} (a plain
 * client store, not routing) — switching it re-renders with the new
 * messages immediately, no navigation involved.
 */
import { NextIntlClientProvider } from 'next-intl';
import { useLocaleStore } from '@/store/useLocaleStore';
import { MESSAGES } from '@/i18n/messages';

export default function IntlProvider({ children }: { children: React.ReactNode }) {
  const locale = useLocaleStore((s) => s.locale);

  return (
    <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]} timeZone="America/Bogota">
      {children}
    </NextIntlClientProvider>
  );
}
