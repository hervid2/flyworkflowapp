import type { MediaStatus, MediaType } from '@prisma/client';

/** Lightweight incident reference embedded in a gallery item — enough to display without a per-row lookup (mirrors audit-log's incident ref). */
export interface MediaIncidentRefDto {
  id: string;
  sequenceId: string;
  title: string;
  project: { id: string; name: string };
}

export class MediaGalleryItemDto {
  id!: string;
  name!: string;
  type!: MediaType;
  format!: string;
  size!: number;
  status!: MediaStatus;
  url!: string;
  createdAt!: Date;
  incident!: MediaIncidentRefDto;
}

export function toMediaGalleryItemDto(media: {
  id: string;
  name: string;
  type: MediaType;
  format: string;
  size: number;
  status: MediaStatus;
  url: string;
  createdAt: Date;
  incident: MediaIncidentRefDto;
}): MediaGalleryItemDto {
  return {
    id: media.id,
    name: media.name,
    type: media.type,
    format: media.format,
    size: media.size,
    status: media.status,
    url: media.url,
    createdAt: media.createdAt,
    incident: media.incident,
  };
}
