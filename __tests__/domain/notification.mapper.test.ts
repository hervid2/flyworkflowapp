/**
 * Unit tests for toAppNotification: verifies the backend raw shape is mapped
 * onto the frontend domain model field-by-field (mirrors incident.mapper.test.ts).
 */
import { describe, it, expect } from 'vitest';
import { toAppNotification, type RawNotification } from '@/domain/mappers/notification.mapper';

const rawNotification: RawNotification = {
  id: 'notif-1',
  type: 'assignment',
  incident: {
    id: 'inc-1',
    sequenceId: '0001',
    title: 'Filtración en sótano',
    project: { id: 'proj-1', name: 'Torre Norte' },
  },
  readAt: null,
  createdAt: '2026-08-30T10:00:00Z',
};

describe('toAppNotification', () => {
  it('mapea todos los campos escalares y el incidente embebido', () => {
    const notification = toAppNotification(rawNotification);

    expect(notification).toEqual({
      id: 'notif-1',
      type: 'assignment',
      incident: {
        id: 'inc-1',
        sequenceId: '0001',
        title: 'Filtración en sótano',
        project: { id: 'proj-1', name: 'Torre Norte' },
      },
      readAt: null,
      createdAt: '2026-08-30T10:00:00Z',
    });
  });

  it('preserva readAt cuando la notificación ya fue leída', () => {
    const notification = toAppNotification({
      ...rawNotification,
      readAt: '2026-08-30T11:00:00Z',
    });
    expect(notification.readAt).toBe('2026-08-30T11:00:00Z');
  });

  it('mapea cada tipo de notificación sin transformarlo', () => {
    expect(toAppNotification({ ...rawNotification, type: 'status_changed' }).type).toBe(
      'status_changed',
    );
    expect(toAppNotification({ ...rawNotification, type: 'approval' }).type).toBe('approval');
  });
});
