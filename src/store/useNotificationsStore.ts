'use client';
/**
 * Global in-app notifications store backing the TopBar bell (roadmap 8.7).
 * A plain (non-persisted, non-context) Zustand store like useAuthStore: one
 * instance app-wide is exactly what a notification feed needs, since the
 * bell lives in the shared TopBar and must keep its unread count in sync
 * regardless of which page is currently mounted.
 */
import { create } from 'zustand';
import type { AppNotification } from '@/domain/models';

interface NotificationsState {
  items: AppNotification[];
  loaded: boolean;
  setInitial: (items: AppNotification[]) => void;
  /** Merges freshly-polled notifications in, ignoring any already present (by id). */
  prepend: (items: AppNotification[]) => void;
  markRead: (id: string) => void;
}

export const useNotificationsStore = create<NotificationsState>()((set) => ({
  items: [],
  loaded: false,

  setInitial: (items) => set({ items, loaded: true }),

  prepend: (incoming) =>
    set((state) => {
      const existingIds = new Set(state.items.map((n) => n.id));
      const fresh = incoming.filter((n) => !existingIds.has(n.id));
      return fresh.length === 0 ? state : { items: [...fresh, ...state.items] };
    }),

  markRead: (id) =>
    set((state) => ({
      items: state.items.map((n) =>
        n.id === id && !n.readAt ? { ...n, readAt: new Date().toISOString() } : n,
      ),
    })),
}));

export const selectUnreadCount = (state: NotificationsState): number =>
  state.items.filter((n) => !n.readAt).length;
