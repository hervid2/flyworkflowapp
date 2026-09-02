/**
 * Read-side data-access for the documents list: real backend calls,
 * server-only (mirrors gallery.service.ts). `GET /media` is open to any
 * authenticated org member — no forbidden state to handle here. Only
 * document-type media is requested; image/video attachments have their
 * own page (`/galeria`, roadmap 8.4).
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

interface DocumentsPage {
  items: GalleryMediaItem[];
  total: number;
  page: number;
  pageSize: number;
}

async function getAccessToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(ACCESS_TOKEN_COOKIE)?.value;
}

/** `GET /media?type=document`, server-side paginated. */
export async function getDocumentsMedia(page = 1): Promise<DocumentsPage> {
  const accessToken = await getAccessToken();
  const query = new URLSearchParams({ page: String(page) });
  query.append('type', 'document');

  const res = await apiFetch<PaginatedResponse<RawGalleryMediaItem>>(`/media?${query.toString()}`, {
    accessToken,
  });

  return { ...res, items: res.items.map(toGalleryMediaItem) };
}
