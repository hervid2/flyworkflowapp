/**
 * Static catalog of construction projects an incident can belong to. Feeds the
 * project selector in the create form; ids/names match the ones
 * `scripts/generate-mock-data.ts` draws from for the seeded dataset.
 */
import type { Project } from '@/domain/models';

export const PROJECTS: Project[] = [
  { id: '51ae14076884e5134d3afcde', name: 'Edificio Cedro Real - Etapa 1' },
  { id: 'e845fadb72b05dfd164a0f52', name: 'Conjunto Residencial Los Almendros' },
];
