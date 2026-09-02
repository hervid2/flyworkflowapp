/**
 * Maps the backend's `/media` response shape onto the frontend's
 * {@link GalleryMediaItem} domain model. Mirrors audit-log.mapper.ts's role
 * for the audit trail — pure and framework-agnostic.
 */
import type { GalleryMediaItem, Media } from '@/domain/models';

export interface RawGalleryMediaItem {
  id: string;
  name: string;
  type: Media['type'];
  format: string;
  size: number;
  status: Media['status'];
  url: string;
  createdAt: string;
  incident: {
    id: string;
    sequenceId: string;
    title: string;
    project: { id: string; name: string };
  };
}

export function toGalleryMediaItem(raw: RawGalleryMediaItem): GalleryMediaItem {
  return {
    id: raw.id,
    name: raw.name,
    type: raw.type,
    format: raw.format,
    size: raw.size,
    status: raw.status,
    url: raw.url,
    createdAt: raw.createdAt,
    incident: raw.incident,
  };
}
