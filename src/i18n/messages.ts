/**
 * Assembles the flat namespace JSON files under `messages/<locale>/` into the
 * single messages object `NextIntlClientProvider` expects. One file per
 * screen area (topbar, map, dashboard, createIssue, validation, common) keeps
 * each translated independently instead of one sprawling catalog.
 */
import type { AbstractIntlMessages } from 'next-intl';
import esCommon from '../../messages/es/common.json';
import esTopbar from '../../messages/es/topbar.json';
import esMap from '../../messages/es/map.json';
import esDashboard from '../../messages/es/dashboard.json';
import esCreateIssue from '../../messages/es/createIssue.json';
import esValidation from '../../messages/es/validation.json';
import esHistorial from '../../messages/es/historial.json';
import esPapelera from '../../messages/es/papelera.json';
import esGaleria from '../../messages/es/galeria.json';
import enCommon from '../../messages/en/common.json';
import enTopbar from '../../messages/en/topbar.json';
import enMap from '../../messages/en/map.json';
import enDashboard from '../../messages/en/dashboard.json';
import enCreateIssue from '../../messages/en/createIssue.json';
import enValidation from '../../messages/en/validation.json';
import enHistorial from '../../messages/en/historial.json';
import enPapelera from '../../messages/en/papelera.json';
import enGaleria from '../../messages/en/galeria.json';

export type Locale = 'es' | 'en';
export const LOCALES: Locale[] = ['es', 'en'];
export const DEFAULT_LOCALE: Locale = 'es';

export const MESSAGES: Record<Locale, AbstractIntlMessages> = {
  es: {
    common: esCommon,
    topbar: esTopbar,
    map: esMap,
    dashboard: esDashboard,
    createIssue: esCreateIssue,
    validation: esValidation,
    historial: esHistorial,
    papelera: esPapelera,
    galeria: esGaleria,
  },
  en: {
    common: enCommon,
    topbar: enTopbar,
    map: enMap,
    dashboard: enDashboard,
    createIssue: enCreateIssue,
    validation: enValidation,
    historial: enHistorial,
    papelera: enPapelera,
    galeria: enGaleria,
  },
};
