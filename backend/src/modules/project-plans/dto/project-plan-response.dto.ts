import type { MediaType } from '@prisma/client';

export class ProjectPlanResponseDto {
  id!: string;
  projectId!: string;
  name!: string;
  type!: MediaType;
  format!: string;
  size!: number;
  url!: string;
  createdAt!: Date;
}

export function toProjectPlanResponseDto(plan: {
  id: string;
  projectId: string;
  name: string;
  type: MediaType;
  format: string;
  size: number;
  url: string;
  createdAt: Date;
}): ProjectPlanResponseDto {
  return {
    id: plan.id,
    projectId: plan.projectId,
    name: plan.name,
    type: plan.type,
    format: plan.format,
    size: plan.size,
    url: plan.url,
    createdAt: plan.createdAt,
  };
}
