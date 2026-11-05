'use client';

import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, MapPin, X } from 'lucide-react';
import type { Transition } from 'motion/react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import {
  formatBuildingDate,
  getBuildingDescription,
  getBuildingName,
} from '@/modules/building/lib/building-view-helpers';
import type { Building } from '@/modules/building/model/building-types';
import type { BuildingsTranslator } from '@/modules/building/ui/building-metadata';
import {
  BuilderNames,
  BuildingSourceDetails,
  BuildingTags,
  BuildingTypeBadge,
} from '@/modules/building/ui/building-metadata';
import { useModalInteraction } from '@/shared/hooks/use-modal-interaction';

interface BuildingDetailsDialogProps {
  activeImage: string | undefined;
  building: Building | null;
  currentImageIndex: number;
  imageLoading: boolean;
  imageTransitionDirection: -1 | 1;
  isImageError: (imageUrl: string) => boolean;
  locale: string;
  mounted: boolean;
  onClose: () => void;
  onImageError: (imageUrl: string) => void;
  onImageLoad: () => void;
  onNextImage: () => void;
  onPreviousImage: () => void;
  onSelectImage: (imageIndex: number) => void;
  t: BuildingsTranslator;
}

export function BuildingDetailsDialog({
  activeImage,
  building,
  currentImageIndex,
  imageLoading,
  imageTransitionDirection,
  isImageError,
  locale,
  mounted,
  onClose,
  onImageError,
  onImageLoad,
  onNextImage,
  onPreviousImage,
  onSelectImage,
  t,
}: BuildingDetailsDialogProps) {
  const commonT = useTranslations('common');
  const titleId = useId();
  const detailsId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  useModalInteraction(dialogRef, mounted && Boolean(building), onClose);
  const shouldReduceMotion = useReducedMotion();
  const buildingKey = building?.id ?? null;
  const imageUrls = building?.images ?? [];
  const [expandedState, setExpandedState] = useState<{
    buildingKey: string | null;
    expanded: boolean;
  }>({ buildingKey, expanded: false });
  const expanded = expandedState.buildingKey === buildingKey && expandedState.expanded;

  useEffect(() => {
    setExpandedState({ buildingKey, expanded: false });
  }, [buildingKey]);

  // Keyboard navigation
  useEffect(() => {
    if (!building) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (imageUrls.length < 2) return;
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
  }, [building, imageUrls.length, onNextImage, onPreviousImage]);

  if (!mounted || !building) return null;

  const buildingName = getBuildingName(building, locale);
  const hasMultipleImages = imageUrls.length > 1;
  const panelTransition: Transition = shouldReduceMotion
    ? { duration: 0 }
    : { duration: 0.34, ease: [0.22, 1, 0.36, 1] };

  return createPortal(
    <AnimatePresence>
      <motion.dialog
        ref={dialogRef}
        open
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.25 }}
        className="building-archive-overlay"
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label={t('dialog.close')}
          data-dialog-close
          className="building-archive-close ui-floating-control"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Image stage */}
        <div className="building-archive-stage">
          {activeImage && !isImageError(activeImage) ? (
            <AnimatePresence custom={imageTransitionDirection} mode="wait">
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
                  onLoad={onImageLoad}
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
          {hasMultipleImages && !imageLoading ? (
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
                  <h2 id={titleId}>{buildingName}</h2>
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
                    <span className="building-archive-info-bar__meta-value">
                      {building.coordinates.world} · {building.coordinates.x},{' '}
                      {building.coordinates.y}, {building.coordinates.z}
                    </span>
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
                  onClick={() =>
                    setExpandedState((previousState) => ({
                      buildingKey,
                      expanded:
                        previousState.buildingKey === buildingKey ? !previousState.expanded : true,
                    }))
                  }
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
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.dialog>
    </AnimatePresence>,
    document.body,
  );
}
