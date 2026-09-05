/**
 * Project-level attachment (roadmap 8.11) — real image/PDF plans on a
 * `Project`, the functional reinterpretation of the map toolbar's decorative
 * "BIM Plans" button. Reuses `Media`'s type union rather than a dedicated one.
 */
import type { Media } from './incident.model';

export interface ProjectPlan {
  id: string;
  projectId: string;
  name: string;
  type: Extract<Media['type'], 'image' | 'document'>;
  format: string;
  size: number;
  url: string;
  createdAt: string;
}
