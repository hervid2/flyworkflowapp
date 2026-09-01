/**
 * Reference-data fetches feeding the create-incident form's pickers:
 * incident types, the organization's projects, tags and teammates. All
 * client-side (called when the form opens), all scoped to the caller's own
 * organization by the JWT — no orgId is ever passed explicitly.
 */
import { apiFetch } from '@/lib/api-client';
import { useAuthStore, refreshAccessToken } from '@/store/useAuthStore';
import type { IncidentType, Project, Tag, UserRef } from '@/domain/models';

interface IncidentTypeResponse {
  id: string;
  key: string;
  name: string;
  nameEn: string;
}

interface ProjectResponse {
  id: string;
  orgId: string;
  name: string;
  createdAt: string;
}

interface TagResponse {
  id: string;
  orgId: string;
  name: string;
  color: string;
}

interface UserProfileResponse {
  id: string;
  orgId: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  createdAt: string;
}

function authedFetch<T>(path: string): Promise<T> {
  const accessToken = useAuthStore.getState().accessToken;
  return apiFetch<T>(path, { accessToken }, refreshAccessToken);
}

export async function getIncidentTypes(): Promise<IncidentType[]> {
  const types = await authedFetch<IncidentTypeResponse[]>('/incident-types');
  return types.map((t) => ({ id: t.id, key: t.key, name: t.name, name_en: t.nameEn }));
}

export async function getProjects(): Promise<Project[]> {
  const projects = await authedFetch<ProjectResponse[]>('/projects');
  return projects.map((p) => ({ id: p.id, name: p.name }));
}

export async function getTags(): Promise<Tag[]> {
  const tags = await authedFetch<TagResponse[]>('/tags');
  return tags.map((t) => ({ id: t.id, name: t.name, color: t.color }));
}

/** Teammates in the caller's own organization, for the assignee/observer pickers. */
export async function getOrgMembers(): Promise<UserRef[]> {
  const orgId = useAuthStore.getState().user?.orgId;
  if (!orgId) return [];
  const members = await authedFetch<UserProfileResponse[]>(`/organizations/${orgId}/members`);
  return members.map((m) => ({
    id: m.id,
    name: m.name,
    email: m.email,
    avatarUrl: m.avatarUrl ?? undefined,
  }));
}
