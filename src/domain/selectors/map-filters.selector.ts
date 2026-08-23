/**
 * Applies the map filter bar's state (docs/roadmap.md F2.6) to the incident
 * list MapboxViewer plots. Previously the bar wrote to the filters store but
 * nothing read it back — markers always showed every incident regardless.
 *
 * "Últimas N visitas" has no literal `visit` entity in the domain, so each
 * distinct calendar day that has a reported incident stands in for one field
 * visit: the filter keeps incidents reported on or before `date`, then keeps
 * only those from the `lastVisits` most recent such days.
 */
import { parseISO, startOfDay, isAfter, format } from 'date-fns';
import type { Incident } from '../models';
import type { MapFilters } from '../models';

export function filterIncidentsByMapWindow(
  incidents: Incident[],
  mapFilters: MapFilters,
): Incident[] {
  const referenceDate = startOfDay(parseISO(mapFilters.date));

  const upToDate = incidents.filter(
    (i) => !isAfter(startOfDay(parseISO(i.createdAt)), referenceDate),
  );

  const visitDays = Array.from(
    new Set(upToDate.map((i) => format(parseISO(i.createdAt), 'yyyy-MM-dd'))),
  )
    .sort()
    .reverse()
    .slice(0, mapFilters.lastVisits);
  const visitDaySet = new Set(visitDays);

  return upToDate.filter((i) => visitDaySet.has(format(parseISO(i.createdAt), 'yyyy-MM-dd')));
}
