import type {
  ApprovalStatus,
  IncidentPriority,
  IncidentStatus,
} from '@prisma/client';
import { toUserRefDto, UserRefDto } from '../../../common/dto/user-ref.dto';

interface RawUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

interface RawIncident {
  id: string;
  sequenceId: string;
  orgId: string;
  title: string;
  description: string;
  priority: IncidentPriority;
  status: IncidentStatus;
  approval: ApprovalStatus;
  deleted: boolean;
  lat: number | null;
  lng: number | null;
  locationDescription: string | null;
  dueDate: Date | null;
  closingDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  project: { id: string; name: string };
  type: { id: string; key: string; name: string; nameEn: string };
  owner: RawUser;
  assignees: { user: RawUser }[];
  observers: { user: RawUser }[];
  tags: { tag: { id: string; name: string; color: string } }[];
}

export class IncidentResponseDto {
  id!: string;
  sequenceId!: string;
  orgId!: string;
  title!: string;
  description!: string;
  priority!: IncidentPriority;
  status!: IncidentStatus;
  approval!: ApprovalStatus;
  deleted!: boolean;
  coordinates!: { lat: number; lng: number } | null;
  locationDescription!: string | null;
  dueDate!: Date | null;
  closingDate!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
  project!: { id: string; name: string };
  type!: { id: string; key: string; name: string; nameEn: string };
  owner!: UserRefDto;
  assignees!: UserRefDto[];
  observers!: UserRefDto[];
  tags!: { id: string; name: string; color: string }[];
}

export function toIncidentResponseDto(
  incident: RawIncident,
): IncidentResponseDto {
  return {
    id: incident.id,
    sequenceId: incident.sequenceId,
    orgId: incident.orgId,
    title: incident.title,
    description: incident.description,
    priority: incident.priority,
    status: incident.status,
    approval: incident.approval,
    deleted: incident.deleted,
    coordinates:
      incident.lat !== null && incident.lng !== null
        ? { lat: incident.lat, lng: incident.lng }
        : null,
    locationDescription: incident.locationDescription,
    dueDate: incident.dueDate,
    closingDate: incident.closingDate,
    createdAt: incident.createdAt,
    updatedAt: incident.updatedAt,
    project: incident.project,
    type: incident.type,
    owner: toUserRefDto(incident.owner),
    assignees: incident.assignees.map((a) => toUserRefDto(a.user)),
    observers: incident.observers.map((o) => toUserRefDto(o.user)),
    tags: incident.tags.map((t) => t.tag),
  };
}
