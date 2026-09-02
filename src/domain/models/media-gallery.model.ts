/**
 * Media-gallery domain model backing the `/galeria` page — one entry per
 * media attachment across every incident in the org, newest first (roadmap 8.4).
 */
import type { Media } from './incident.model';

/** Lightweight incident reference embedded in a gallery item — enough to display without a per-row lookup. */
export interface GalleryIncidentRef {
  id: string;
  sequenceId: string;
  title: string;
  project: { id: string; name: string };
}

export interface GalleryMediaItem {
  id: string;
  name: string;
  type: Media['type'];
  format: string;
  size: number;
  status: Media['status'];
  url: string;
  createdAt: string;
  incident: GalleryIncidentRef;
}
