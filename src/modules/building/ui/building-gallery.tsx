'use client';

import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MapPin,
  X,
} from 'lucide-react';
import type { Transition } from 'motion/react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useId, useState } from 'react';

import {
  formatBuildingDate,
  getBuildingDescription,
  getBuildingName,
} from '@/modules/building/lib/building-view-helpers';
import type { Building } from '@/modules/building/model/building-types';
import { useBuildingGallery } from '@/modules/building/model/use-building-gallery';
import { BuildingGalleryFrame } from '@/modules/building/ui/building-gallery-frame';
import { BuildingImageActions } from '@/modules/building/ui/building-image-actions';
import {
  BuilderNames,
  BuildingSourceDetails,
  BuildingTags,
  BuildingTypeBadge,
} from '@/modules/building/ui/building-metadata';
import { BuildingShareActions } from '@/modules/building/ui/building-share-actions';
import { mapPositionUrl } from '@/modules/map/model/map-world';
import { Link, useRouter } from '@/shared/i18n/routing';
import { CopyButton } from '@/shared/ui/action/copy-button';

export function BuildingGallery({
  building,
  modal = false,
}: {
  building: Building;
  modal?: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations('buildings');
  const router = useRouter();
  const onClose = () => router.back();
  const {
    activeImage,
    imageIndex: currentImageIndex,
    loading: imageLoading,
    direction: imageTransitionDirection,
    isImageError,
    handleImageError: onImageError,
    handleImageLoad: onImageLoad,
    next: onNextImage,
    prev: onPreviousImage,
    handleSelectImage: onSelectImage,
  } = useBuildingGallery(building);
  const commonT = useTranslations('common');
  const titleId = useId();
  const detailsId = useId();
  const shouldReduceMotion = useReducedMotion();
  const imageUrls = building.images;
  const [expanded, setExpanded] = useState(!modal);
  const Heading = modal ? 'h2' : 'h1';

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        imageUrls.length < 2 ||
        (event.target instanceof Element &&
          event.target.closest('input, textarea, select, [contenteditable="true"]'))
      )
        return;
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        onPreviousImage();
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        onNextImage();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [imageUrls.length, onNextImage, onPreviousImage]);

  const buildingName = getBuildingName(building, locale);
  const hasMultipleImages = imageUrls.length > 1;
  const panelTransition: Transition = shouldReduceMotion
    ? { duration: 0 }
    : { duration: 0.34, ease: [0.22, 1, 0.36, 1] };

  return (
    <BuildingGalleryFrame
      modal={modal}
      onClose={onClose}
      titleId={titleId}
      reducedMotion={Boolean(shouldReduceMotion)}
    >
      <div className="building-gallery-toolbar">
        {!modal ? (
          <Link href="/buildings" className="building-gallery-back" scroll={false}>
            <ArrowLeft aria-hidden="true" />
            <span>{t('title')}</span>
          </Link>
        ) : (
          <span />
        )}
        <div className="building-gallery-toolbar__actions">
          <BuildingShareActions building={building} />
          {modal ? (
            <button
              type="button"
              onClick={onClose}
              aria-label={t('dialog.close')}
              title={t('dialog.close')}
              data-dialog-close
              className="building-gallery-control"
            >
              <X aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Image stage */}
      <div className="building-archive-stage" aria-busy={imageLoading || undefined}>
        {activeImage && !isImageError(activeImage) ? (
          <AnimatePresence custom={imageTransitionDirection} mode="wait" initial={false}>
            <motion.div
              key={activeImage}
              custom={imageTransitionDirection}
              initial={{ opacity: 0, x: shouldReduceMotion ? 0 : imageTransitionDirection * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: shouldReduceMotion ? 0 : imageTransitionDirection * -40 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="building-archive-stage-image"
            >
              <Image
                src={activeImage}
                alt={buildingName}
                fill
                sizes="100vw"
                className="object-contain"
                unoptimized
                priority
                onLoad={() => onImageLoad(activeImage)}
                onError={() => onImageError(activeImage)}
              />
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="building-archive-stage-empty">
            <p>{buildingName}</p>
          </div>
        )}

        {/* Loading overlay */}
        {imageLoading && activeImage && !isImageError(activeImage) ? (
          <div className="building-archive-stage-loader">
            <span className="building-archive-loader" aria-hidden="true">
              <span className="building-archive-loader__core" />
            </span>
          </div>
        ) : null}

        {/* Navigation arrows */}
        {hasMultipleImages ? (
          <>
            <button
              type="button"
              onClick={onPreviousImage}
              aria-label={t('dialog.previousImage')}
              className="building-archive-nav building-archive-nav--prev"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={onNextImage}
              aria-label={t('dialog.nextImage')}
              className="building-archive-nav building-archive-nav--next"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        ) : null}
      </div>

      {/* Bottom info bar */}
      <div className="building-archive-info-bar-frame">
        <motion.div
          layout
          transition={panelTransition}
          className={`building-archive-info-bar ${expanded ? 'is-expanded' : 'is-collapsed'}`}
        >
          <motion.div layout="position" className="building-archive-info-bar__main">
            <div className="building-archive-info-bar__left">
              {/* Type badge + name */}
              <div className="building-archive-info-bar__header">
                <BuildingTypeBadge buildType={building.buildType} compact t={t} />
                <Heading id={titleId}>{buildingName}</Heading>
              </div>

              <div className="building-archive-info-bar__meta-grid">
                <span className="building-archive-info-bar__meta-item building-archive-info-bar__meta-item--wide">
                  <span className="building-archive-info-bar__builder-pills">
                    <BuilderNames builders={building.builders} compact />
                  </span>
                </span>
                <span className="building-archive-info-bar__meta-item">
                  <MapPin
                    className="building-archive-info-bar__meta-icon h-3.5 w-3.5"
                    aria-hidden="true"
                  />
                  <a
                    className="building-archive-info-bar__meta-value building-gallery-map-link"
                    href={mapPositionUrl(
                      building.coordinates.world,
                      building.coordinates.x,
                      building.coordinates.z,
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={t('actions.viewOnMap')}
                  >
                    {building.coordinates.world} · {building.coordinates.x},{' '}
                    {building.coordinates.y}, {building.coordinates.z}
                  </a>
                  <CopyButton
                    value={`${building.coordinates.world} · ${building.coordinates.x}, ${building.coordinates.y}, ${building.coordinates.z}`}
                    label={t('share.copyCoordinates')}
                    className="building-coordinate-copy"
                  />
                </span>
                <span className="building-archive-info-bar__meta-item">
                  <CalendarDays
                    className="building-archive-info-bar__meta-icon h-3.5 w-3.5"
                    aria-hidden="true"
                  />
                  <span className="building-archive-info-bar__meta-value">
                    {formatBuildingDate(building.buildDate, locale)}
                  </span>
                </span>
              </div>
            </div>

            <div className="building-archive-info-bar__right">
              {hasMultipleImages ? (
                <div className="building-archive-image-picker">
                  <p className="building-archive-image-picker__count" aria-live="polite">
                    {t('dialog.currentImage', {
                      current: currentImageIndex + 1,
                      total: imageUrls.length,
                    })}
                  </p>
                  <div className="building-archive-thumbnails">
                    {imageUrls.map((url, i) => (
                      <button
                        key={url}
                        type="button"
                        onClick={() => onSelectImage(i)}
                        aria-label={t('dialog.currentImage', {
                          current: i + 1,
                          total: imageUrls.length,
                        })}
                        aria-pressed={i === currentImageIndex}
                        className={i === currentImageIndex ? 'is-active' : ''}
                      >
                        {isImageError(url) ? (
                          <span>{i + 1}</span>
                        ) : (
                          <Image
                            src={url}
                            alt=""
                            fill
                            sizes="64px"
                            className="object-cover"
                            unoptimized
                            loading="lazy"
                            onError={() => onImageError(url)}
                          />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Expand toggle */}
              <button
                type="button"
                onClick={() => setExpanded((previous) => !previous)}
                aria-label={
                  expanded ? commonT('actions.collapseDetails') : t('dialog.expandDetails')
                }
                aria-expanded={expanded}
                aria-controls={detailsId}
                className={`building-archive-info-bar__expand ${expanded ? 'is-expanded' : ''}`}
              >
                <ChevronDown className="building-archive-expand-icon h-4 w-4" />
              </button>
            </div>
          </motion.div>

          {/* Expanded details */}
          <div
            className={`building-archive-info-expanded ${expanded ? 'is-expanded' : 'is-collapsed'}`}
            id={detailsId}
            inert={!expanded}
            aria-hidden={!expanded}
          >
            <div className="building-archive-info-expanded__clip">
              <div className="building-archive-info-expanded__inner">
                <div className="building-archive-info-expanded__body">
                  <p className="building-archive-info-expanded__desc">
                    {getBuildingDescription(building, locale)}
                  </p>
                  <BuildingSourceDetails building={building} locale={locale} t={t} />
                </div>
                {building.tags && building.tags.length > 0 ? (
                  <div className="building-archive-info-expanded__tags">
                    <BuildingTags building={building} locale={locale} compact />
                  </div>
                ) : null}
                <BuildingImageActions
                  building={building}
                  image={
                    expanded && activeImage && !isImageError(activeImage) ? activeImage : undefined
                  }
                  imageIndex={currentImageIndex}
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </BuildingGalleryFrame>
  );
}
