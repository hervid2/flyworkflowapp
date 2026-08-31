export class IncidentTypeResponseDto {
  id!: string;
  key!: string;
  name!: string;
  nameEn!: string;
}

export function toIncidentTypeResponseDto(type: {
  id: string;
  key: string;
  name: string;
  nameEn: string;
}): IncidentTypeResponseDto {
  return { id: type.id, key: type.key, name: type.name, nameEn: type.nameEn };
}
