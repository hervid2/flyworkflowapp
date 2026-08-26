/** Lightweight user projection embedded in incidents (owner, assignees, observers…). */
export class UserRefDto {
  id!: string;
  name!: string;
  email!: string;
  avatarUrl!: string | null;
}

export function toUserRefDto(user: {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}): UserRefDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
  };
}
