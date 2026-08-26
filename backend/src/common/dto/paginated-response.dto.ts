/** `{ items, total, page, pageSize }` response wrapper shared by every paginated list route. */
export class PaginatedResponseDto<T> {
  items!: T[];
  total!: number;
  page!: number;
  pageSize!: number;
}

export function toPaginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): PaginatedResponseDto<T> {
  return { items, total, page, pageSize };
}
