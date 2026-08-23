'use client';
/**
 * Interactive Mapbox map of all geolocated incidents. Owns the marker layer:
 * rebuilds markers/popups when incidents change, auto-fits the viewport to
 * them, and toggles the 2D/3D projection from the filters store.
 */
import { useEffect, useMemo, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useTranslations } from 'next-intl';
import { useMapbox } from '@/hooks/useMapbox';
import { useIssuesStore } from '@/store/useIssuesStore';
import { useFiltersStore } from '@/store/useFiltersStore';
import {
  buildClusterIndex,
  getClusterLayer,
  getClusterExpansionZoom,
  type IncidentClusterIndex,
} from '@/domain/selectors/map-clusters.selector';
import { filterIncidentsByMapWindow } from '@/domain/selectors/map-filters.selector';
import { createMarkerElement, createClusterElement } from './IncidentMarker';
import { getPopupHTML } from './IncidentPopup';
import styles from './MapboxViewer.module.scss';

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

export default function MapboxViewer() {
  const t = useTranslations('map');
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const clusterIndexRef = useRef<IncidentClusterIndex | null>(null);

  const { mapRef, isLoaded } = useMapbox(containerRef, TOKEN);

  const allIncidents = useIssuesStore((s) => s.incidents);
  const is3D = useFiltersStore((s) => s.is3D);
  const mapFilters = useFiltersStore((s) => s.mapFilters);
  const incidents = useMemo(
    () => filterIncidentsByMapWindow(allIncidents, mapFilters),
    [allIncidents, mapFilters],
  );

  // Sync the 2D/3D projection with the toolbar toggle.
  useEffect(() => {
    if (!mapRef.current || !isLoaded) return;
    mapRef.current.setProjection(is3D ? 'globe' : 'mercator');
  }, [is3D, isLoaded, mapRef]);

  // Rebuild the cluster index whenever incidents change, frame the viewport to
  // them, and (re)render the marker layer on every load/move/zoom so clusters
  // stay accurate as the user pans and zooms.
  useEffect(() => {
    if (!mapRef.current || !isLoaded) return;
    const map = mapRef.current;

    const incidentsById = new Map(incidents.map((i) => [i.id, i]));
    clusterIndexRef.current = buildClusterIndex(incidents);

    const popupLabels = {
      statusOpen: t('statusOpen'),
      statusOnPause: t('statusOnPause'),
      statusClosed: t('statusClosed'),
      priorityHigh: t('priorityHigh'),
      priorityMedium: t('priorityMedium'),
      priorityLow: t('priorityLow'),
      viewDetails: t('popupViewDetails'),
    };

    function renderLayer() {
      const index = clusterIndexRef.current;
      if (!index) return;

      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      const bounds = map.getBounds();
      if (!bounds) return;
      const layer = getClusterLayer(
        index,
        [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()],
        map.getZoom(),
      );

      layer.forEach((point) => {
        if (point.type === 'cluster') {
          const el = createClusterElement(point.count);
          el.addEventListener('click', () => {
            map.flyTo({
              center: [point.lng, point.lat],
              zoom: getClusterExpansionZoom(index, point.clusterId),
            });
          });
          const marker = new mapboxgl.Marker({ element: el })
            .setLngLat([point.lng, point.lat])
            .addTo(map);
          markersRef.current.push(marker);
          return;
        }

        const incident = incidentsById.get(point.incidentId);
        if (!incident) return;

        const popup = new mapboxgl.Popup({
          closeButton: true,
          closeOnClick: false,
          maxWidth: '280px',
          offset: 20,
        }).setHTML(getPopupHTML(incident, popupLabels));

        const marker = new mapboxgl.Marker({ element: createMarkerElement(incident) })
          .setLngLat([point.lng, point.lat])
          .setPopup(popup)
          .addTo(map);
        markersRef.current.push(marker);
      });
    }

    // Frame the viewport so every incident is visible (fit bounds / fly to single).
    const geoPoints: [number, number][] = incidents
      .filter((i) => i.coordinates !== null)
      .map((i) => [i.coordinates!.lng, i.coordinates!.lat]);

    if (geoPoints.length > 1) {
      const bounds = geoPoints.reduce<mapboxgl.LngLatBounds>(
        (b, coord) => b.extend(coord),
        new mapboxgl.LngLatBounds(geoPoints[0], geoPoints[0]),
      );
      map.fitBounds(bounds, { padding: 80, maxZoom: 16 });
    } else if (geoPoints.length === 1) {
      map.flyTo({ center: geoPoints[0], zoom: 14 });
    }

    renderLayer();
    map.on('moveend', renderLayer);
    return () => {
      map.off('moveend', renderLayer);
    };
  }, [incidents, isLoaded, mapRef, t]);

  return (
    <div className={styles['mapbox-viewer']}>
      <div
        ref={containerRef}
        className={styles['mapbox-viewer__canvas']}
        role="application"
        aria-label={t('mapCanvasAriaLabel')}
      />
      {!isLoaded && (
        <div className={styles['mapbox-viewer__loading']} aria-live="polite">
          <span>{t('loadingMap')}</span>
        </div>
      )}
    </div>
  );
}
