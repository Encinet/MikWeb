'use client';

import {
  ChevronLeft,
  ChevronRight,
  Expand,
  Minimize2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { ReactNode, Ref } from 'react';
import { useId, ViewTransition } from 'react';
import { MAX_IMAGE_SCALE } from '@/modules/building/lib/building-image-transform';
import type { BuildingGalleryState } from '@/modules/building/model/use-building-gallery';
import { useBuildingImageZoom } from '@/modules/building/model/use-building-image-zoom';
import { LoadingState } from '@/shared/ui/feedback/loading-state';

export function BuildingGalleryViewer({
  gallery,
  children,
  imageCount,
  stageRef,
  name,
  focused,
  onToggleFocus,
}: {
  gallery: BuildingGalleryState;
  children: ReactNode;
  imageCount: number;
  stageRef: Ref<HTMLDivElement>;
  name: string;
  focused: boolean;
  onToggleFocus: () => void;
}) {
  const t = useTranslations('buildings');
  const commonT = useTranslations('common');
  const helpId = useId();
  const { activeImage, loading, isImageError, handleImageLoad, handleImageError, retryImage } =
    gallery;
  const failed = Boolean(activeImage && isImageError(activeImage));
  const available = Boolean(activeImage && !failed && !loading);
  const zoom = useBuildingImageZoom({
    enabled: available,
    imageKey: activeImage,
    next: gallery.next,
    prev: gallery.prev,
  });
  const { scale, x, y } = zoom.transform;
  const percentage = Math.round(scale * 100);

  return (
    <div className="building-gallery-media">
      <ViewTransition default={{ default: 'none', 'building-focus': 'building-image-focus' }}>
        <div ref={stageRef} className="building-archive-stage" aria-busy={loading || undefined}>
          <section
            ref={zoom.viewportRef}
            className={`building-image-viewport ${scale > 1 ? 'is-zoomed' : ''}`}
            aria-label={t('viewer.imageLabel', { name })}
            aria-describedby={helpId}
            tabIndex={available ? 0 : -1}
            {...zoom.handlers}
          >
            <div
              ref={zoom.transformRef}
              key={activeImage ?? 'empty'}
              className="building-archive-stage-image"
              data-smooth-zoom={zoom.smooth || undefined}
              style={{ transform: `translate3d(${x}px, ${y}px, 0px) scale(${scale})` }}
            >
              {activeImage && !failed ? (
                <Image
                  ref={zoom.imageRef}
                  src={activeImage}
                  alt={name}
                  fill
                  sizes="100vw"
                  className="object-contain"
                  unoptimized
                  loading="eager"
                  fetchPriority="high"
                  draggable={false}
                  onLoad={() => handleImageLoad(activeImage)}
                  onError={() => handleImageError(activeImage)}
                />
              ) : (
                <div className="building-archive-stage-empty">
                  <p role="status">
                    {activeImage ? t('states.imageFailed') : t('states.noImages')}
                  </p>
                  {activeImage ? (
                    <button type="button" className="building-gallery-retry" onClick={retryImage}>
                      <RotateCcw aria-hidden="true" />
                      {commonT('actions.retry')}
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          </section>
          {loading && activeImage && !failed ? (
            <div className="building-archive-stage-loader">
              <LoadingState message={commonT('states.loading')} />
            </div>
          ) : null}
          {imageCount > 1 ? (
            <>
              <button
                type="button"
                onClick={gallery.prev}
                aria-label={t('dialog.previousImage')}
                className="building-archive-nav building-archive-nav--prev"
              >
                <ChevronLeft aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={gallery.next}
                aria-label={t('dialog.nextImage')}
                className="building-archive-nav building-archive-nav--next"
              >
                <ChevronRight aria-hidden="true" />
              </button>
            </>
          ) : null}
        </div>
      </ViewTransition>
      <div className="building-gallery-image-controls">
        {children}
        <ViewTransition default={{ default: 'none', 'building-focus': 'building-controls-focus' }}>
          <fieldset className="building-image-tools" aria-label={t('viewer.controls')}>
            <button
              type="button"
              onClick={() => zoom.zoomTo(scale / 1.5)}
              disabled={!available || scale <= 1}
              aria-label={t('viewer.zoomOut')}
              title={t('viewer.zoomOut')}
            >
              <ZoomOut aria-hidden="true" />
            </button>
            <button
              type="button"
              className="building-image-tools__scale"
              onClick={zoom.reset}
              disabled={!available}
              aria-label={t('viewer.resetZoom')}
              title={t('viewer.resetZoom')}
            >
              {percentage}%
            </button>
            <button
              type="button"
              onClick={() => zoom.zoomTo(scale * 1.5)}
              disabled={!available || scale >= MAX_IMAGE_SCALE}
              aria-label={t('viewer.zoomIn')}
              title={t('viewer.zoomIn')}
            >
              <ZoomIn aria-hidden="true" />
            </button>
            <span className="building-image-tools__divider" />
            <button
              type="button"
              onClick={onToggleFocus}
              aria-pressed={focused}
              aria-label={focused ? t('viewer.exitFocus') : t('viewer.focus')}
              title={focused ? t('viewer.exitFocus') : t('viewer.focus')}
            >
              {focused ? <Minimize2 aria-hidden="true" /> : <Expand aria-hidden="true" />}
            </button>
          </fieldset>
        </ViewTransition>
      </div>
      <p id={helpId} className="sr-only">
        {t('viewer.keyboardHelp')}
      </p>
      <span className="sr-only" role="status" aria-live="polite">
        {t('viewer.zoomLevel', { percentage })}
      </span>
    </div>
  );
}
