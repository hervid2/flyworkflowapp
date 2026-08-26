export class TagResponseDto {
  id!: string;
  orgId!: string;
  name!: string;
  color!: string;
}

export function toTagResponseDto(tag: {
  id: string;
  orgId: string;
  name: string;
  color: string;
}): TagResponseDto {
  return { id: tag.id, orgId: tag.orgId, name: tag.name, color: tag.color };
}
