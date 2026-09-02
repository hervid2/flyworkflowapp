/**
 * Unit tests for the notifications store: setInitial/prepend/markRead and the
 * derived unread-count selector backing the TopBar bell (roadmap 8.7).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useNotificationsStore, selectUnreadCount } from '@/store/useNotificationsStore';
import type { AppNotification } from '@/domain/models';

function makeNotification(overrides: Partial<AppNotification> = {}): AppNotification {
  return {
    id: 'notif-1',
    type: 'assignment',
    incident: {
      id: 'inc-1',
      sequenceId: '0001',
      title: 'Filtración',
      project: { id: 'proj-1', name: 'Torre Norte' },
    },
    readAt: null,
    createdAt: '2026-08-30T10:00:00Z',
    ...overrides,
  };
}

describe('useNotificationsStore', () => {
  beforeEach(() => {
    useNotificationsStore.setState({ items: [], loaded: false });
  });

  it('arranca vacío y no cargado', () => {
    const state = useNotificationsStore.getState();
    expect(state.items).toEqual([]);
    expect(state.loaded).toBe(false);
  });

  it('setInitial reemplaza los items y marca loaded', () => {
    const items = [makeNotification()];
    useNotificationsStore.getState().setInitial(items);

    const state = useNotificationsStore.getState();
    expect(state.items).toEqual(items);
    expect(state.loaded).toBe(true);
  });

  it('setInitial con una lista vacía igual marca loaded', () => {
    useNotificationsStore.getState().setInitial([]);
    expect(useNotificationsStore.getState().loaded).toBe(true);
  });

  it('prepend antepone notificaciones nuevas', () => {
    const first = makeNotification({ id: 'notif-1' });
    const second = makeNotification({ id: 'notif-2', createdAt: '2026-08-30T11:00:00Z' });
    useNotificationsStore.getState().setInitial([first]);

    useNotificationsStore.getState().prepend([second]);

    expect(useNotificationsStore.getState().items.map((n) => n.id)).toEqual(['notif-2', 'notif-1']);
  });

  it('prepend ignora ids ya presentes (deduplicación por id)', () => {
    const first = makeNotification({ id: 'notif-1' });
    useNotificationsStore.getState().setInitial([first]);

    useNotificationsStore.getState().prepend([first]);

    expect(useNotificationsStore.getState().items).toEqual([first]);
  });

  it('markRead marca una notificación como leída sin afectar las demás', () => {
    const unread = makeNotification({ id: 'notif-1', readAt: null });
    const otherUnread = makeNotification({ id: 'notif-2', readAt: null });
    useNotificationsStore.getState().setInitial([unread, otherUnread]);

    useNotificationsStore.getState().markRead('notif-1');

    const state = useNotificationsStore.getState();
    expect(state.items.find((n) => n.id === 'notif-1')?.readAt).not.toBeNull();
    expect(state.items.find((n) => n.id === 'notif-2')?.readAt).toBeNull();
  });

  it('markRead es un no-op si la notificación ya estaba leída', () => {
    const alreadyRead = makeNotification({ readAt: '2026-08-30T09:00:00Z' });
    useNotificationsStore.getState().setInitial([alreadyRead]);

    useNotificationsStore.getState().markRead(alreadyRead.id);

    expect(useNotificationsStore.getState().items[0].readAt).toBe('2026-08-30T09:00:00Z');
  });

  it('selectUnreadCount cuenta solo las notificaciones sin leer', () => {
    useNotificationsStore
      .getState()
      .setInitial([
        makeNotification({ id: 'a', readAt: null }),
        makeNotification({ id: 'b', readAt: '2026-08-30T09:00:00Z' }),
        makeNotification({ id: 'c', readAt: null }),
      ]);

    expect(selectUnreadCount(useNotificationsStore.getState())).toBe(2);
  });
});
