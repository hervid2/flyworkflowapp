'use client';
/**
 * Custom incident categories added from CategoryManagerModal. Merged into
 * the fetched incident-type catalog by IssueForm so a category created in
 * the sub-modal is immediately selectable in the form, not just held in a
 * disconnected list. Client-session-only — there's no backend endpoint yet
 * for creating a real incident type (a real admin feature, not itemized for
 * Phase 7); these vanish on refresh, same as before Phase 7.
 */
import { create } from 'zustand';
import type { IncidentType } from '@/domain/models';

interface CategoriesState {
  customTypes: IncidentType[];
  addCategory: (name: string) => void;
  removeCategory: (id: string) => void;
}

const ACCENTS: Record<string, string> = {
  a: 'a',
  á: 'a',
  e: 'e',
  é: 'e',
  i: 'i',
  í: 'i',
  o: 'o',
  ó: 'o',
  u: 'u',
  ú: 'u',
  ü: 'u',
  ñ: 'n',
};

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .split('')
    .map((ch) => ACCENTS[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export const useCategoriesStore = create<CategoriesState>()((set) => ({
  customTypes: [],
  addCategory: (name) =>
    set((s) => ({
      customTypes: [
        ...s.customTypes,
        { id: crypto.randomUUID(), key: slugify(name), name, name_en: name },
      ],
    })),
  removeCategory: (id) => set((s) => ({ customTypes: s.customTypes.filter((c) => c.id !== id) })),
}));
