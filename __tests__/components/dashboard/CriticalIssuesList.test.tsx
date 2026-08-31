/**
 * Regression coverage for docs/roadmap.md F2.1: a global dashboard filter
 * (useFiltersStore) must actually reach CriticalIssuesList's table, not just
 * the metrics selector. Originally about a company dimension retired in
 * Phase 7 (roadmap.md decision #5 — a session only ever sees one
 * organization, so cross-company filtering is meaningless); re-targeted at
 * createdByUser/responsibleUser, the real dimensions that remain.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import CriticalIssuesList from '@/components/dashboard/CriticalIssuesList';
import { IssuesStoreProvider } from '@/store/useIssuesStore';
import { useFiltersStore } from '@/store/useFiltersStore';
import { MESSAGES } from '@/i18n/messages';
import type { Incident, UserRef } from '@/domain/models';

const DIEGO: UserRef = {
  id: 'a3f7c1d8-e6b9-4025-b8a1-c7d20b1f1234',
  name: 'Diego Salazar',
  email: 'diego.salazar@constructoradelvalle.com',
};

const SANTIAGO: UserRef = {
  id: 'a3f7c1d8-e6b9-4025-b8a1-c7d20b1f5678',
  name: 'Santiago Ibarra',
  email: 'santiago.ibarra@grupomeridiano.com',
};

function makeIncident(overrides: Partial<Incident>): Incident {
  return {
    id: overrides.id ?? 'inc-1',
    sequenceId: '0001',
    order: 1,
    title: 'Incidencia de prueba',
    description: '',
    type: { id: 't1', key: 'plumbing', name: 'Hidrosanitario', name_en: 'Plumbing' },
    priority: 'medium',
    status: 'open',
    approval: 'pending',
    project: { id: 'p1', name: 'Proyecto Demo' },
    owner: DIEGO,
    assignees: [],
    observers: [],
    coordinates: null,
    locationDescription: null,
    dueDate: null,
    closingDate: null,
    media: [],
    tags: [],
    deleted: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const INCIDENTS: Incident[] = [
  makeIncident({ id: 'inc-diego', title: 'Fuga en columna', owner: DIEGO }),
  makeIncident({ id: 'inc-santiago', title: 'Grieta en muro', owner: SANTIAGO }),
];

function renderWithIncidents(incidents: Incident[]) {
  return render(
    <NextIntlClientProvider locale="es" messages={MESSAGES.es}>
      <IssuesStoreProvider initialIncidents={incidents}>
        <CriticalIssuesList riskFilter={null} />
      </IssuesStoreProvider>
    </NextIntlClientProvider>,
  );
}

describe('CriticalIssuesList — filtros globales del dashboard', () => {
  beforeEach(() => {
    useFiltersStore.getState().resetDashboardFilters();
  });

  it('respeta createdByUser: solo muestra incidencias del creador seleccionado', () => {
    useFiltersStore.getState().setDashboardFilters({ createdByUser: [DIEGO.id] });

    renderWithIncidents(INCIDENTS);

    expect(screen.getByText('Fuga en columna')).toBeInTheDocument();
    expect(screen.queryByText('Grieta en muro')).not.toBeInTheDocument();
  });

  it('respeta responsibleUser: filtra por el responsable asignado', () => {
    const assigned = makeIncident({
      id: 'inc-assigned-santiago',
      title: 'Filtración en techo',
      owner: DIEGO,
      assignees: [SANTIAGO],
    });

    useFiltersStore.getState().setDashboardFilters({ responsibleUser: [SANTIAGO.id] });

    renderWithIncidents([...INCIDENTS, assigned]);

    expect(screen.getByText('Filtración en techo')).toBeInTheDocument();
    expect(screen.queryByText('Fuga en columna')).not.toBeInTheDocument();
    expect(screen.queryByText('Grieta en muro')).not.toBeInTheDocument();
  });
});
