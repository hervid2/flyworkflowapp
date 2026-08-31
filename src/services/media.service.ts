/**
 * Direct-to-S3 media upload, client-side only. `POST /media/presign`
 * requires an existing incident id, so this only ever runs after the
 * incident itself has been created — see IssueForm's post-create loop.
 */
import { apiFetch } from '@/lib/api-client';
import { useAuthStore, refreshAccessToken } from '@/store/useAuthStore';
import type { Media } from '@/domain/models';

interface PresignResponse {
  uploadUrl: string;
  fileUrl: string;
}

interface MediaResponse {
  id: string;
  incidentId: string;
  name: string;
  type: Media['type'];
  format: string;
  size: number;
  status: Media['status'];
  url: string;
  createdAt: string;
}

function clientFetch<T>(path: string, options: Parameters<typeof apiFetch>[1] = {}): Promise<T> {
  const accessToken = useAuthStore.getState().accessToken;
  return apiFetch<T>(path, { ...options, accessToken }, refreshAccessToken);
}

function mediaTypeFromFile(file: File): Media['type'] {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  return 'document';
}

/** Presign → PUT directly to S3 → record the attachment. Throws on any step's failure. */
export async function uploadMedia(incidentId: string, file: File): Promise<Media> {
  const { uploadUrl, fileUrl } = await clientFetch<PresignResponse>('/media/presign', {
    method: 'POST',
    body: {
      incidentId,
      filename: file.name,
      contentType: file.type,
      size: file.size,
    },
  });

  // Presigned URL carries its own auth — a plain fetch, not through the API
  // client (wrong base URL, and no Authorization header belongs on an S3 PUT).
  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!putRes.ok) {
    throw new Error(`Upload to storage failed (${putRes.status})`);
  }

  const record = await clientFetch<MediaResponse>(`/incidents/${incidentId}/media`, {
    method: 'POST',
    body: {
      fileUrl,
      name: file.name,
      type: mediaTypeFromFile(file),
      format: file.name.split('.').pop() ?? '',
      size: file.size,
    },
  });

  return {
    id: record.id,
    name: record.name,
    type: record.type,
    format: record.format,
    size: record.size,
    status: record.status,
    url: record.url,
  };
}
