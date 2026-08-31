/**
 * Reproduces the company-filter bug described in docs/roadmap.md F2.1: the
 * dashboard's "created by company" filter reaches the metrics selector but
 * never reaches CriticalIssuesList, so the table keeps showing incidents from
 * companies the user just filtered out.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import CriticalIssuesList from '@/components/dashboard/CriticalIssuesList';
import { IssuesStoreProvider } from '@/store/useIssuesStore';
import { useFiltersStore } from '@/store/useFiltersStore';
import { MESSAGES } from '@/i18n/messages';
import type { Incident, UserRef } from '@/domain/models';

const VALLE_OWNER: UserRef = {
  id: 'a3f7c1d8e6b94025f8a1c7d2', // CONSTRUCTORA DEL VALLE, per mock-users.ts
  name: 'Diego Salazar',
  email: 'diego.salazar@constructoradelvalle.com',
};

const MERIDIANO_OWNER: UserRef = {
  id: 'meridiano_u1', // GRUPO MERIDIANO, per mock-users.ts
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
    owner: VALLE_OWNER,
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
  makeIncident({ id: 'inc-valle', title: 'Fuga en columna', owner: VALLE_OWNER }),
  makeIncident({ id: 'inc-meridiano', title: 'Grieta en muro', owner: MERIDIANO_OWNER }),
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

describe('CriticalIssuesList — filtro de compañía del dashboard', () => {
  beforeEach(() => {
    useFiltersStore.getState().resetDashboardFilters();
  });

  it('respeta createdByCompany: solo muestra incidencias de la compañía seleccionada', () => {
    useFiltersStore
      .getState()
      .setDashboardFilters({ createdByCompany: ['CONSTRUCTORA DEL VALLE'] });

    renderWithIncidents(INCIDENTS);

    expect(screen.getByText('Fuga en columna')).toBeInTheDocument();
    expect(screen.queryByText('Grieta en muro')).not.toBeInTheDocument();
  });

  it('respeta responsibleByCompany: filtra por la compañía del responsable asignado', () => {
    const assigned = makeIncident({
      id: 'inc-assigned-meridiano',
      title: 'Filtración en techo',
      owner: VALLE_OWNER,
      assignees: [MERIDIANO_OWNER],
    });

    useFiltersStore.getState().setDashboardFilters({ responsibleByCompany: ['GRUPO MERIDIANO'] });

    renderWithIncidents([...INCIDENTS, assigned]);

    expect(screen.getByText('Filtración en techo')).toBeInTheDocument();
    expect(screen.queryByText('Fuga en columna')).not.toBeInTheDocument();
    expect(screen.queryByText('Grieta en muro')).not.toBeInTheDocument();
  });
});
