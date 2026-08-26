import type { MediaStatus, MediaType } from '@prisma/client';

export class MediaResponseDto {
  id!: string;
  incidentId!: string;
  name!: string;
  type!: MediaType;
  format!: string;
  size!: number;
  status!: MediaStatus;
  url!: string;
  createdAt!: Date;
}

export function toMediaResponseDto(media: {
  id: string;
  incidentId: string;
  name: string;
  type: MediaType;
  format: string;
  size: number;
  status: MediaStatus;
  url: string;
  createdAt: Date;
}): MediaResponseDto {
  return {
    id: media.id,
    incidentId: media.incidentId,
    name: media.name,
    type: media.type,
    format: media.format,
    size: media.size,
    status: media.status,
    url: media.url,
    createdAt: media.createdAt,
  };
}
