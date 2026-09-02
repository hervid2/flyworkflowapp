'use client';
/** Shown on `/papelera` when the signed-in user isn't admin+ (backend returns 403 on `GET /incidents/trash`). */
import { useTranslations } from 'next-intl';
import AccessRestricted from '@/components/ui/AccessRestricted';

export default function TrashForbidden() {
  const t = useTranslations('papelera');
  return <AccessRestricted title={t('forbiddenTitle')} message={t('forbiddenMessage')} />;
}
