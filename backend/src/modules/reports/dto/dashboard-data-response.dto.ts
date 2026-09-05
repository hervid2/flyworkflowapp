/**
 * `GET /reports/dashboard-data` response — a flat, record-shaped JSON meant
 * to drop straight into Power BI's "Web"/"From URL" connector (Power Query
 * turns each array into a table with almost no transformation) or a Looker
 * Studio community JSON connector. Deliberately smaller than the frontend's
 * `DashboardMetrics` (no team leaderboards/heatmap/calendar) — those are
 * screen-rendering concerns, not the kind of thing an external BI tool pulls.
 */
export class DashboardDataResponseDto {
  generatedAt!: string;
  totalIncidents!: number;
  openCount!: number;
  onPauseCount!: number;
  closedCount!: number;
  overdueActiveCount!: number;
  /** Mean days from creation to closing across closed incidents in scope; `null` when none are closed. */
  avgResolutionDays!: number | null;
  byStatus!: { status: string; count: number }[];
  byPriority!: { priority: string; count: number }[];
  byType!: { typeKey: string; typeName: string; count: number }[];
  /** Daily counts — `created` bucketed by `createdAt`, `closed` bucketed by `closingDate`. */
  trend!: { date: string; created: number; closed: number }[];
}
