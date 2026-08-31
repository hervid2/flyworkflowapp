/**
 * Maps the backend's incident response shape onto the frontend's `Incident`
 * domain model. Pure and framework-agnostic (no `next/headers`, no browser
 * APIs) so both the server-only read service and the client-only mutation
 * service can share it instead of duplicating the mapping.
 */
import type { Incident, IncidentType, UserRef, Tag, Project } from '@/domain/models';
import type { ApprovalStatus } from '@/domain/models/incident.model';

interface RawUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export interface RawIncident {
  id: string;
  sequenceId: string;
  title: string;
  description: string;
  priority: Incident['priority'];
  status: Incident['status'];
  approval: ApprovalStatus;
  deleted: boolean;
  coordinates: { lat: number; lng: number } | null;
  locationDescription: string | null;
  dueDate: string | null;
  closingDate: string | null;
  createdAt: string;
  updatedAt: string;
  project: Project;
  type: { id: string; key: string; name: string; nameEn: string };
  owner: RawUser;
  assignees: RawUser[];
  observers: RawUser[];
  tags: Tag[];
}

function toUserRef(user: RawUser): UserRef {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl ?? undefined,
  };
}

function toIncidentType(type: RawIncident['type']): IncidentType {
  return { id: type.id, key: type.key, name: type.name, name_en: type.nameEn };
}

export function toIncident(raw: RawIncident): Incident {
  return {
    id: raw.id,
    sequenceId: raw.sequenceId,
    order: 0,
    title: raw.title,
    description: raw.description,
    type: toIncidentType(raw.type),
    priority: raw.priority,
    status: raw.status,
    approval: raw.approval,
    project: raw.project,
    owner: toUserRef(raw.owner),
    assignees: raw.assignees.map(toUserRef),
    observers: raw.observers.map(toUserRef),
    coordinates: raw.coordinates,
    locationDescription: raw.locationDescription,
    dueDate: raw.dueDate,
    closingDate: raw.closingDate,
    media: [],
    tags: raw.tags,
    deleted: raw.deleted,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}
