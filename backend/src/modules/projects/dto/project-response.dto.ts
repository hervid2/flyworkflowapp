/** Response shape for every `/projects` route. */
export class ProjectResponseDto {
  id!: string;
  orgId!: string;
  name!: string;
  createdAt!: Date;
}

export function toProjectResponseDto(project: {
  id: string;
  orgId: string;
  name: string;
  createdAt: Date;
}): ProjectResponseDto {
  return {
    id: project.id,
    orgId: project.orgId,
    name: project.name,
    createdAt: project.createdAt,
  };
}
