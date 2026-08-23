/**
 * Builds the HTML string for a marker's Mapbox popup. Mapbox popups accept raw
 * HTML, so this returns a template string instead of JSX; the incident-detail
 * link is wired up by the parent via the `data-id` attribute.
 */
import type { Incident } from '@/domain/models';

/** Resolved i18n labels the caller must supply — see `getPopupHTML` below. */
export interface PopupLabels {
  statusOpen: string;
  statusOnPause: string;
  statusClosed: string;
  priorityHigh: string;
  priorityMedium: string;
  priorityLow: string;
  viewDetails: string;
}

const PRIORITY_COLORS: Record<Incident['priority'], string> = {
  high: '#e5484d',
  medium: '#f5a623',
  low: '#34c759',
};

/** Escapes user-supplied text — popups are raw HTML, so prevent injection. */
function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Returns the popup markup for an incident (code, title, badges, assignees). */
export function getPopupHTML(incident: Incident, labels: PopupLabels): string {
  const statusLabels: Record<Incident['status'], string> = {
    open: labels.statusOpen,
    on_pause: labels.statusOnPause,
    closed: labels.statusClosed,
  };
  const priorityLabels: Record<Incident['priority'], string> = {
    high: labels.priorityHigh,
    medium: labels.priorityMedium,
    low: labels.priorityLow,
  };

  const priorityColor = PRIORITY_COLORS[incident.priority];
  const visibleAssignees = incident.assignees.slice(0, 2);
  const extraCount = Math.max(0, incident.assignees.length - 2);
  const assigneeText =
    visibleAssignees.length > 0
      ? visibleAssignees.map((a) => esc(a.name)).join(', ') +
        (extraCount > 0 ? ` +${extraCount}` : '')
      : '';

  return `
    <div class="incident-popup">
      <p class="incident-popup__code">#${esc(incident.sequenceId)}</p>
      <h3 class="incident-popup__title">${esc(incident.title)}</h3>
      <div class="incident-popup__badges">
        <span class="incident-popup__badge" style="background:${priorityColor}22;color:${priorityColor}">
          ${priorityLabels[incident.priority]}
        </span>
        <span class="incident-popup__badge incident-popup__badge--status">
          ${statusLabels[incident.status]}
        </span>
      </div>
      ${assigneeText ? `<p class="incident-popup__assignees">${assigneeText}</p>` : ''}
      <a class="incident-popup__link" href="#" data-id="${esc(incident.id)}">
        ${labels.viewDetails}
      </a>
    </div>
  `;
}
