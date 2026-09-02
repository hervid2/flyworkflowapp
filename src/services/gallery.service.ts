/**
 * Read-side data-access for the media gallery: real backend calls,
 * server-only (mirrors audit-log.service.ts/trash.service.ts). `GET /media`
 * is open to any authenticated org member — no forbidden state to handle
 * here, unlike `/historial` and `/papelera`. Only `image`/`video` media is
 * requested: document-type attachments get their own page (roadmap 8.5).
 */
import { cookies } from 'next/headers';
import { apiFetch } from '@/lib/api-client';
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth-cookie';
import {
  toGalleryMediaItem,
  type RawGalleryMediaItem,
} from '@/domain/mappers/media-gallery.mapper';
import type { GalleryMediaItem } from '@/domain/models';

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

interface GalleryPage {
  items: GalleryMediaItem[];
  total: number;
  page: number;
  pageSize: number;
}

async function getAccessToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(ACCESS_TOKEN_COOKIE)?.value;
}

/** `GET /media?type=image&type=video`, server-side paginated. */
export async function getGalleryMedia(page = 1): Promise<GalleryPage> {
  const accessToken = await getAccessToken();
  const query = new URLSearchParams({ page: String(page) });
  query.append('type', 'image');
  query.append('type', 'video');

  const res = await apiFetch<PaginatedResponse<RawGalleryMediaItem>>(`/media?${query.toString()}`, {
    accessToken,
  });

  return { ...res, items: res.items.map(toGalleryMediaItem) };
}
