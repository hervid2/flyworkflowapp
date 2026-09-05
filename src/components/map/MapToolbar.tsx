'use client';
import {
  Navigation,
  Layers,
  Mountain,
  Box,
  Clock,
  Camera,
  Rotate3d,
  Star,
  MapPin,
  Brush,
  Share2,
  Map,
  Plus,
  FileStack,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useFiltersStore } from '@/store/useFiltersStore';
import { useModalStore } from '@/store/useModalStore';
import styles from './MapToolbar.module.scss';

/**
 * Floating map toolbar. Four controls are wired: the 2D/3D projection toggle
 * (filters store), "create incident", "Share" — a real invite-collaborators
 * flow (roadmap 8.9) — and "BIM Plans" — a real attach/view project plans
 * flow, image/PDF only (roadmap 8.11) — the last two via the modal store; the
 * remaining icon buttons are presentational placeholders.
 */
export default function MapToolbar() {
  const t = useTranslations('map');
  const is3D = useFiltersStore((s) => s.is3D);
  const toggle3D = useFiltersStore((s) => s.toggle3D);
  const openModal = useModalStore((s) => s.open);

  const secondaryGroup = [
    { icon: Star, label: t('favorites') },
    { icon: MapPin, label: t('location') },
    { icon: Layers, label: t('layers') },
    { icon: Map, label: t('heatmap') },
    { icon: Brush, label: t('annotations') },
  ];

  return (
    <>
      {/* Bottom-left group: navigation controls */}
      <div className={styles['toolbar-left']} role="toolbar" aria-label={t('mapNavControls')}>
        <button
          className={styles['toolbar__btn']}
          type="button"
          aria-label={t('recenter')}
          title={t('recenter')}
        >
          <Navigation size={17} />
        </button>
        <button
          className={styles['toolbar__btn']}
          type="button"
          aria-label={t('planSection')}
          title={t('planSection')}
        >
          <Box size={17} />
        </button>
        <button
          className={styles['toolbar__btn']}
          type="button"
          aria-label={t('mapLayers')}
          title={t('mapLayers')}
        >
          <Layers size={17} />
        </button>
        <button
          className={styles['toolbar__btn']}
          type="button"
          aria-label={t('terrainElevation')}
          title={t('terrainElevation')}
        >
          <Mountain size={17} />
        </button>
      </div>

      {/* Bottom-center group: view mode (2D/3D + capture tools) */}
      <div className={styles['toolbar-center']} role="toolbar" aria-label={t('viewMode')}>
        <div
          className={styles['toolbar__toggle-group']}
          role="group"
          aria-label={t('projection2d3d')}
        >
          <button
            className={[styles['toolbar__toggle'], !is3D ? styles['toolbar__toggle--active'] : '']
              .filter(Boolean)
              .join(' ')}
            type="button"
            onClick={() => is3D && toggle3D()}
            aria-pressed={!is3D}
          >
            2D
          </button>
          <button
            className={[styles['toolbar__toggle'], is3D ? styles['toolbar__toggle--active'] : '']
              .filter(Boolean)
              .join(' ')}
            type="button"
            onClick={() => !is3D && toggle3D()}
            aria-pressed={is3D}
          >
            3D
          </button>
        </div>

        <span className={styles['toolbar__center-divider']} aria-hidden="true" />

        <button
          className={styles['toolbar__btn']}
          type="button"
          aria-label={t('timelapse')}
          title={t('timelapse')}
        >
          <Clock size={17} />
        </button>
        <button
          className={styles['toolbar__btn']}
          type="button"
          aria-label={t('capture')}
          title={t('capture')}
        >
          <Camera size={17} />
        </button>
        <button
          className={styles['toolbar__btn']}
          type="button"
          aria-label={t('view360')}
          title={t('view360')}
        >
          <Rotate3d size={17} />
        </button>
      </div>

      {/* Right group: primary action (create) and tool shortcuts */}
      <div className={styles['toolbar-right']} role="toolbar" aria-label={t('toolsActions')}>
        <button
          className={styles['toolbar__primary-btn']}
          type="button"
          onClick={() => openModal('create-issue')}
          aria-label={t('createIncident')}
          title={t('createIncident')}
        >
          <Plus size={22} strokeWidth={2.5} />
        </button>

        <div className={styles['toolbar__secondary-group']}>
          <button
            className={styles['toolbar__btn']}
            type="button"
            onClick={() => openModal('project-plans')}
            aria-label={t('bimPlans')}
            title={t('bimPlans')}
          >
            <FileStack size={17} />
          </button>
          {secondaryGroup.map(({ icon: Icon, label }) => (
            <button
              key={label}
              className={styles['toolbar__btn']}
              type="button"
              aria-label={label}
              title={label}
            >
              <Icon size={17} />
            </button>
          ))}
          <button
            className={styles['toolbar__btn']}
            type="button"
            onClick={() => openModal('invite-collaborators')}
            aria-label={t('share')}
            title={t('share')}
          >
            <Share2 size={17} />
          </button>
        </div>
      </div>
    </>
  );
}
