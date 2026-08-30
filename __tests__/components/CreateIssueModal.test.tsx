/**
 * Integration test for the full create-incident flow. Renders the modal over an
 * isolated issues store and drives it end to end: open/close, validation errors,
 * and a successful submit that adds the incident to the store. mapbox-gl is
 * mocked because the nested LocationPicker would otherwise need WebGL.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import CreateIssueModal from '@/components/modals/create-issue/CreateIssueModal';
import { createIssuesStore, IssuesStoreContext } from '@/store/useIssuesStore';
import { useModalStore } from '@/store/useModalStore';
import { useCategoriesStore } from '@/store/useCategoriesStore';
import { useAuthStore } from '@/store/useAuthStore';
import { MESSAGES } from '@/i18n/messages';
import type { ReactNode } from 'react';

const TEST_USER = {
  id: 'a3f7c1d8e6b94025f8a1c7d2',
  name: 'Diego Salazar',
  email: 'diego.salazar@constructoradelvalle.com',
  avatarUrl: 'https://i.pravatar.cc/150?u=diego.salazar',
  role: 'Ingeniero Civil',
  company: 'CONSTRUCTORA DEL VALLE',
};

// ── Mapbox GL mock ────────────────────────────────────────────────────────────
// Required because LocationPicker imports mapbox-gl and runs it inside useEffect.
vi.mock('mapbox-gl', () => {
  function MapMock(this: Record<string, unknown>) {
    this.on = vi.fn();
    this.off = vi.fn();
    this.remove = vi.fn();
    this.addControl = vi.fn();
    this.setProjection = vi.fn();
    this.flyTo = vi.fn();
    this.fitBounds = vi.fn();
    this.getCenter = vi.fn(() => ({ lng: -74.07, lat: 4.71 }));
    this.getZoom = vi.fn(() => 12);
  }

  function MarkerMock(this: Record<string, unknown>) {
    this.setLngLat = vi.fn().mockReturnThis();
    this.setPopup = vi.fn().mockReturnThis();
    this.addTo = vi.fn().mockReturnThis();
    this.remove = vi.fn();
    this.on = vi.fn();
    this.getLngLat = vi.fn(() => ({ lng: -74.07, lat: 4.71 }));
  }

  function PopupMock(this: Record<string, unknown>) {
    this.setHTML = vi.fn().mockReturnThis();
    this.setLngLat = vi.fn().mockReturnThis();
    this.addTo = vi.fn().mockReturnThis();
    this.remove = vi.fn();
  }

  function LngLatBoundsMock(this: Record<string, unknown>, sw: unknown, ne: unknown) {
    this.extend = vi.fn().mockReturnThis();
    this.getSouthWest = vi.fn(() => sw);
    this.getNorthEast = vi.fn(() => ne);
  }

  function NavigationControlMock(this: Record<string, unknown>) {
    this.onAdd = vi.fn();
    this.onRemove = vi.fn();
  }

  function FullscreenControlMock(this: Record<string, unknown>) {
    this.onAdd = vi.fn();
    this.onRemove = vi.fn();
  }

  return {
    default: {
      accessToken: '',
      Map: vi.fn().mockImplementation(function (...args: unknown[]) {
        return new (MapMock as unknown as new (...a: unknown[]) => unknown)(...args);
      }),
      Marker: vi.fn().mockImplementation(function (...args: unknown[]) {
        return new (MarkerMock as unknown as new (...a: unknown[]) => unknown)(...args);
      }),
      Popup: vi.fn().mockImplementation(function (...args: unknown[]) {
        return new (PopupMock as unknown as new (...a: unknown[]) => unknown)(...args);
      }),
      LngLatBounds: vi.fn().mockImplementation(function (...args: unknown[]) {
        return new (LngLatBoundsMock as unknown as new (...a: unknown[]) => unknown)(...args);
      }),
      NavigationControl: vi.fn().mockImplementation(function (...args: unknown[]) {
        return new (NavigationControlMock as unknown as new (...a: unknown[]) => unknown)(...args);
      }),
      FullscreenControl: vi.fn().mockImplementation(function (...args: unknown[]) {
        return new (FullscreenControlMock as unknown as new (...a: unknown[]) => unknown)(...args);
      }),
      AttributionControl: vi.fn().mockImplementation(function () {}),
    },
  };
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

// Renders CreateIssueModal with a real (isolated) IssuesStore + open modal
function renderModal() {
  const store = createIssuesStore([]);

  render(
    <NextIntlClientProvider locale="es" messages={MESSAGES.es}>
      <IssuesStoreContext.Provider value={store}>
        <CreateIssueModal />
      </IssuesStoreContext.Provider>
    </NextIntlClientProvider>,
  );

  return { store };
}

// Wrapper for act()-protected renders used with external JSX
function renderWithProviders(ui: ReactNode) {
  const store = createIssuesStore([]);
  render(
    <NextIntlClientProvider locale="es" messages={MESSAGES.es}>
      <IssuesStoreContext.Provider value={store}>{ui}</IssuesStoreContext.Provider>
    </NextIntlClientProvider>,
  );
  return { store };
}

// ── Setup / teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  // Open the create-issue modal so CreateIssueModal renders
  useModalStore.setState({ activeModal: 'create-issue' });
  // IssueForm resolves the incident owner from the session
  useAuthStore.setState({ user: TEST_USER, accessToken: 'test-token', isAuthenticated: true });
});

afterEach(() => {
  useModalStore.setState({ activeModal: null });
  useCategoriesStore.setState({ customTypes: [] });
  useAuthStore.setState({ user: null, accessToken: null, isAuthenticated: false });
  vi.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CreateIssueModal — flujo de creación completo', () => {
  it('renderiza el modal con el título "Crear Incidencia"', () => {
    renderModal();
    expect(screen.getByRole('heading', { name: 'Crear Incidencia' })).toBeInTheDocument();
  });

  it('cierra el modal al presionar el botón X', () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar modal' }));
    expect(useModalStore.getState().activeModal).toBeNull();
  });

  it('cierra el modal al presionar Escape', () => {
    renderModal();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(useModalStore.getState().activeModal).toBeNull();
  });

  it('no cierra el modal al enviar sin campos obligatorios', async () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Crear' }));
    await waitFor(() => {
      expect(useModalStore.getState().activeModal).toBe('create-issue');
    });
  });

  it('muestra error en "Título" cuando se intenta enviar vacío', async () => {
    renderModal();
    // Leave title empty, fill everything else
    fireEvent.change(screen.getByLabelText(/descripción/i), {
      target: { value: 'Descripción válida para la prueba' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Crear' }));
    await waitFor(() => {
      expect(screen.getByText('El título es obligatorio')).toBeInTheDocument();
    });
  });

  it('crea una incidencia y cierra el modal al enviar con todos los campos obligatorios', async () => {
    const { store } = renderModal();

    // Fill required fields
    fireEvent.change(screen.getByLabelText(/título/i), {
      target: { value: 'Fisura en muro sur' },
    });
    fireEvent.change(screen.getByLabelText(/descripción/i), {
      target: { value: 'Fisura horizontal visible de aproximadamente 30 cm.' },
    });
    fireEvent.change(screen.getByLabelText(/fecha de vencimiento/i), {
      target: { value: tomorrow() },
    });
    fireEvent.change(screen.getByLabelText(/categoría/i), {
      target: { value: 'e05995817a9a9bf5c0298f7d' }, // Hidrosanitario
    });
    fireEvent.change(screen.getByLabelText(/proyecto/i), {
      target: { value: '51ae14076884e5134d3afcde' }, // Edificio Cedro Real - Etapa 1
    });
    // Priority already defaults to "media"

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Crear' }));
    });

    await waitFor(() => {
      // Modal must be closed
      expect(useModalStore.getState().activeModal).toBeNull();
      // Store must have the new incident
      const incidents = store.getState().incidents;
      expect(incidents).toHaveLength(1);
      expect(incidents[0].title).toBe('Fisura en muro sur');
      expect(incidents[0].status).toBe('open');
      // Owner and project come from the session, not a hardcoded stand-in
      expect(incidents[0].owner.id).toBe(TEST_USER.id);
      expect(incidents[0].project.id).toBe('51ae14076884e5134d3afcde');
    });
  });

  it('la nueva incidencia tiene prioridad y tipo correctos', async () => {
    const { store } = renderModal();

    fireEvent.change(screen.getByLabelText(/título/i), {
      target: { value: 'Cable expuesto en tablero' },
    });
    fireEvent.change(screen.getByLabelText(/descripción/i), {
      target: { value: 'Cable de 220V sin aislante en tablero eléctrico del piso 2.' },
    });
    fireEvent.change(screen.getByLabelText(/fecha de vencimiento/i), {
      target: { value: tomorrow() },
    });
    fireEvent.change(screen.getByLabelText(/categoría/i), {
      target: { value: '074cf498175293d292634177' }, // Eléctrico
    });
    fireEvent.change(screen.getByLabelText(/proyecto/i), {
      target: { value: 'e845fadb72b05dfd164a0f52' }, // Conjunto Residencial Los Almendros
    });
    fireEvent.change(screen.getByLabelText(/prioridad/i), {
      target: { value: 'high' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Crear' }));
    });

    await waitFor(() => {
      const inc = store.getState().incidents[0];
      expect(inc.priority).toBe('high');
      expect(inc.type.key).toBe('electrical');
    });
  });
});

describe('CreateIssueModal — estado del modal', () => {
  it('no renderiza nada cuando activeModal no es create-issue', () => {
    useModalStore.setState({ activeModal: null });
    const { store } = renderWithProviders(<CreateIssueModal />);
    expect(store).toBeDefined();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('CreateIssueModal — gestor de categorías', () => {
  it('una categoría agregada en el gestor aparece en el <select> del formulario', async () => {
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Gestionar categorías' }));
    fireEvent.change(screen.getByLabelText('Nombre de la nueva categoría'), {
      target: { value: 'Impermeabilización' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    const categoryList = screen.getByRole('list', { name: 'Categorías personalizadas' });
    expect(within(categoryList).getByText('Impermeabilización')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Volver al formulario' }));

    const select = screen.getByLabelText(/categoría/i) as HTMLSelectElement;
    const option = Array.from(select.options).find((o) => o.text === 'Impermeabilización');
    expect(option).toBeDefined();
  });

  it('una incidencia creada con una categoría personalizada guarda su nombre y clave', async () => {
    const { store } = renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Gestionar categorías' }));
    fireEvent.change(screen.getByLabelText('Nombre de la nueva categoría'), {
      target: { value: 'Impermeabilización' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Volver al formulario' }));

    fireEvent.change(screen.getByLabelText(/título/i), {
      target: { value: 'Filtración en cubierta' },
    });
    fireEvent.change(screen.getByLabelText(/descripción/i), {
      target: { value: 'Filtración visible tras la última lluvia.' },
    });
    fireEvent.change(screen.getByLabelText(/fecha de vencimiento/i), {
      target: { value: tomorrow() },
    });
    fireEvent.change(screen.getByLabelText(/proyecto/i), {
      target: { value: '51ae14076884e5134d3afcde' }, // Edificio Cedro Real - Etapa 1
    });

    const select = screen.getByLabelText(/categoría/i) as HTMLSelectElement;
    const customId = Array.from(select.options).find((o) => o.text === 'Impermeabilización')!.value;
    fireEvent.change(select, { target: { value: customId } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Crear' }));
    });

    await waitFor(() => {
      const inc = store.getState().incidents[0];
      expect(inc.type.name).toBe('Impermeabilización');
      expect(inc.type.key).toBe('impermeabilizacion');
    });
  });
});
