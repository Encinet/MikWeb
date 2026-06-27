'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ChevronDown, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';

import {
  getBuildingDescription,
  getBuildingName,
  passthroughImageLoader,
} from '@/modules/building/lib/building-view-helpers';
import type { Building, LocalizedText } from '@/modules/building/model/building-types';
import type { BuildingsTranslator } from '@/modules/building/ui/building-metadata';
import {
  BuildingTags,
  BuildingTypeBadge,
} from '@/modules/building/ui/building-metadata';

interface BuildingDetailsDialogProps {
  activeImage: string | undefined;
  building: Building | null;
  currentImageIndex: number;
  formatDate: (timestamp: number | string) => string;
  getTagKey: (building: Building, tag: LocalizedText) => string;
  imageLoading: boolean;
  imageTransitionDirection: -1 | 1;
  imageUrls: string[];
  isImageError: (imageUrl: string) => boolean;
  locale: string;
  mounted: boolean;
  onClose: () => void;
  onImageError: (imageUrl: string) => void;
  onImageLoad: () => void;
  onNextImage: () => void;
  onPreviousImage: () => void;
  onSelectImage: (imageIndex: number, imageUrls: string[]) => void;
  t: BuildingsTranslator;
}

export function BuildingDetailsDialog({
  activeImage,
  building,
  currentImageIndex,
  formatDate,
  getTagKey,
  imageLoading,
  imageTransitionDirection,
  imageUrls,
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
  const titleId = useId();
  const [expanded, setExpanded] = useState(false);

  // Reset expanded state when building changes
  useEffect(() => {
    setExpanded(false);
  }, [building]);

  // Keyboard navigation
  useEffect(() => {
    if (!building) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
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
  }, [building, imageUrls.length, onClose, onNextImage, onPreviousImage]);

  if (!mounted || !building) return null;

  const buildingName = getBuildingName(building, locale);
  const hasMultipleImages = imageUrls.length > 1;

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="building-archive-overlay"
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label={t('dialog.close')}
          className="building-archive-close"
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
                initial={{ opacity: 0, x: imageTransitionDirection * 60 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: imageTransitionDirection * -60 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                className="building-archive-stage-image"
              >
                <Image
                  loader={passthroughImageLoader}
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
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
            </div>
          ) : null}
        </div>

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

        {/* Bottom info bar */}
        <div className="building-archive-info-bar">
          <div className="building-archive-info-bar__main">
            <div className="building-archive-info-bar__left">
              {/* Type badge + name */}
              <div className="building-archive-info-bar__header">
                <BuildingTypeBadge buildType={building.buildType} compact t={t} />
                <h2 id={titleId}>{buildingName}</h2>
              </div>

              {/* Builders */}
              <p className="building-archive-info-bar__builders">
                {building.builders.map((b) => b.name).join(', ')}
              </p>

              {/* Meta row: coords + date */}
              <p className="building-archive-info-bar__meta">
                <span>
                  {building.coordinates.x}, {building.coordinates.y}, {building.coordinates.z}
                </span>
                <span className="building-archive-info-bar__meta-sep">·</span>
                <span>{formatDate(building.buildDate)}</span>
              </p>
            </div>

            <div className="building-archive-info-bar__right">
              {/* Image dots */}
              {hasMultipleImages ? (
                <div className="building-archive-dots">
                  {imageUrls.map((url, i) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => onSelectImage(i, imageUrls)}
                      aria-label={t('dialog.currentImage', { current: i + 1, total: imageUrls.length })}
                      className={i === currentImageIndex ? 'is-active' : ''}
                    />
                  ))}
                </div>
              ) : null}

              {/* Expand toggle */}
              <button
                type="button"
                onClick={() => setExpanded((prev) => !prev)}
                aria-label={expanded ? '收起详情' : '展开详情'}
                className={`building-archive-info-bar__expand ${expanded ? 'is-expanded' : ''}`}
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Expanded details */}
          <AnimatePresence>
            {expanded ? (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="building-archive-info-expanded"
              >
                <div className="building-archive-info-expanded__inner">
                  <p className="building-archive-info-expanded__desc">
                    {getBuildingDescription(building, locale)}
                  </p>
                  {building.tags && building.tags.length > 0 ? (
                    <div className="building-archive-info-expanded__tags">
                      <BuildingTags building={building} getTagKey={getTagKey} locale={locale} />
                    </div>
                  ) : null}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Click overlay background to close */}
        <div className="building-archive-overlay-bg" onClick={onClose} />
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}