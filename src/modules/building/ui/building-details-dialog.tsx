'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Building2, ChevronLeft, ChevronRight, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  getBuildingDescription,
  getBuildingName,
  passthroughImageLoader,
} from '@/modules/building/lib/building-view-helpers';
import type { Building, LocalizedText } from '@/modules/building/model/building-types';
import type { BuildingsTranslator } from '@/modules/building/ui/building-metadata';
import {
  BuildingDetailFacts,
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

const detailPanelSurfaceStyle = {
  background: 'var(--theme-surface-glass-light)',
  border: '1px solid var(--theme-border-glass-light)',
  boxShadow: 'inset 0 1px 0 var(--theme-shadow-modal-inset)',
};

const floatingControlStyle = {
  background: 'var(--theme-surface-glass)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid var(--theme-border-glass)',
};

function BuildingDetailGallery({
  activeImage,
  buildingName,
  currentImageIndex,
  imageLoading,
  imageUrls,
  isImageError,
  onImageError,
  onImageLoad,
  onNextImage,
  onPreviousImage,
  onSelectImage,
  t,
  transitionDirection,
}: {
  activeImage: string | undefined;
  buildingName: string;
  currentImageIndex: number;
  imageLoading: boolean;
  imageUrls: string[];
  isImageError: (imageUrl: string) => boolean;
  onImageError: (imageUrl: string) => void;
  onImageLoad: () => void;
  onNextImage: () => void;
  onPreviousImage: () => void;
  onSelectImage: (imageIndex: number, imageUrls: string[]) => void;
  t: BuildingsTranslator;
  transitionDirection: -1 | 1;
}) {
  const desktopControllerRef = useRef<HTMLDivElement | null>(null);
  const mobileControllerRef = useRef<HTMLDivElement | null>(null);
  const desktopItemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const mobileItemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const centerActiveControl = (
      container: HTMLDivElement | null,
      item: HTMLButtonElement | null | undefined,
    ) => {
      if (!container || !item) {
        return;
      }

      const nextScrollLeft = item.offsetLeft - (container.clientWidth - item.clientWidth) / 2;
      const maxScrollLeft = container.scrollWidth - container.clientWidth;

      container.scrollTo({
        left: Math.max(0, Math.min(nextScrollLeft, maxScrollLeft)),
        behavior: 'smooth',
      });
    };

    centerActiveControl(desktopControllerRef.current, desktopItemRefs.current[currentImageIndex]);
    centerActiveControl(mobileControllerRef.current, mobileItemRefs.current[currentImageIndex]);
  }, [currentImageIndex]);

  return (
    <div
      className="relative flex h-[min(44vh,24rem)] min-h-72 w-full items-center justify-center overflow-hidden lg:h-auto lg:min-h-[42rem] lg:w-[58%]"
      style={{
        background:
          'radial-gradient(circle at top left, rgba(192, 132, 252, 0.16), transparent 42%), rgba(0, 0, 0, 0.2)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-white/6 via-transparent to-black/18" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-linear-to-b from-black/38 via-black/10 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-black/48 via-black/12 to-transparent" />

      {activeImage && !isImageError(activeImage) ? (
        <>
          <div className="absolute top-4 left-4 z-10 flex max-w-[calc(100%-5rem)] flex-wrap gap-2">
            <div
              className="rounded-full px-3 py-1.5 text-xs font-medium text-white/90 sm:text-sm"
              style={floatingControlStyle}
            >
              {t('dialog.currentImage', {
                current: currentImageIndex + 1,
                total: imageUrls.length,
              })}
            </div>
          </div>

          {imageLoading ? (
            <div className="absolute inset-0 z-[5] flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <Building2
                  className="h-24 w-24 animate-pulse"
                  style={{ color: 'var(--theme-text-faint)' }}
                />
                <div className="flex gap-2">
                  {[0, 150, 300].map((delay) => (
                    <div
                      key={delay}
                      className="h-2 w-2 animate-bounce rounded-full"
                      style={{
                        background: 'var(--theme-accent-purple)',
                        animationDelay: `${delay}ms`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          <AnimatePresence initial={false} custom={transitionDirection} mode="wait">
            <motion.div
              key={activeImage}
              custom={transitionDirection}
              initial={{ opacity: 0, x: transitionDirection * 56 }}
              animate={{ opacity: imageLoading ? 0.25 : 1, x: 0 }}
              exit={{ opacity: 0, x: transitionDirection * -56 }}
              transition={{
                duration: imageLoading ? 0.14 : 0.26,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="absolute inset-0"
              style={{ willChange: 'transform, opacity' }}
            >
              <Image
                loader={passthroughImageLoader}
                src={activeImage}
                alt={buildingName}
                fill
                sizes="(max-width: 768px) 100vw, 60vw"
                className="object-contain"
                unoptimized
                loading="lazy"
                onLoad={onImageLoad}
                onError={() => onImageError(activeImage)}
              />
            </motion.div>
          </AnimatePresence>

          {imageUrls.length > 1 ? (
            <>
              <button
                type="button"
                onClick={onPreviousImage}
                aria-label={t('dialog.previousImage')}
                title={t('dialog.previousImage')}
                className="absolute top-1/2 left-4 z-10 -translate-y-1/2 rounded-full p-3 transition-all duration-200"
                style={floatingControlStyle}
                onMouseEnter={(event) => {
                  event.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.background = 'var(--theme-surface-glass)';
                }}
              >
                <ChevronLeft className="h-6 w-6" style={{ color: 'var(--theme-text-primary)' }} />
              </button>

              <button
                type="button"
                onClick={onNextImage}
                aria-label={t('dialog.nextImage')}
                title={t('dialog.nextImage')}
                className="absolute top-1/2 right-4 z-10 -translate-y-1/2 rounded-full p-3 transition-all duration-200"
                style={floatingControlStyle}
                onMouseEnter={(event) => {
                  event.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.background = 'var(--theme-surface-glass)';
                }}
              >
                <ChevronRight className="h-6 w-6" style={{ color: 'var(--theme-text-primary)' }} />
              </button>

              <div
                ref={desktopControllerRef}
                className="building-dialog-control-scroll absolute right-4 bottom-4 left-4 z-10 hidden overflow-x-auto rounded-2xl p-2 sm:block"
                style={floatingControlStyle}
              >
                <div className="mx-auto flex w-max min-w-full items-center justify-center gap-2">
                  {imageUrls.map((imageUrl, index) => (
                    <button
                      type="button"
                      key={imageUrl}
                      ref={(element) => {
                        desktopItemRefs.current[index] = element;
                      }}
                      onClick={() => onSelectImage(index, imageUrls)}
                      aria-label={t('dialog.currentImage', {
                        current: index + 1,
                        total: imageUrls.length,
                      })}
                      className="relative h-12 w-16 shrink-0 overflow-hidden rounded-xl transition-all duration-200 sm:h-14 sm:w-20"
                      style={{
                        border:
                          index === currentImageIndex
                            ? '1px solid rgba(255, 255, 255, 0.72)'
                            : '1px solid rgba(255, 255, 255, 0.18)',
                        boxShadow:
                          index === currentImageIndex
                            ? '0 0 0 1px rgba(255, 255, 255, 0.14), 0 10px 20px rgba(0, 0, 0, 0.16)'
                            : 'none',
                        transform: index === currentImageIndex ? 'translateY(-1px)' : 'none',
                      }}
                    >
                      {!isImageError(imageUrl) ? (
                        <Image
                          loader={passthroughImageLoader}
                          src={imageUrl}
                          alt=""
                          fill
                          sizes="80px"
                          className="object-cover"
                          unoptimized
                          loading="lazy"
                          onError={() => onImageError(imageUrl)}
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                          <Building2
                            className="h-5 w-5"
                            style={{ color: 'rgba(255,255,255,0.72)' }}
                          />
                        </div>
                      )}
                      <div
                        className="absolute inset-0 transition-opacity duration-200"
                        style={{
                          background:
                            index === currentImageIndex
                              ? 'linear-gradient(to top, rgba(0, 0, 0, 0.08), rgba(255, 255, 255, 0.04))'
                              : 'rgba(0, 0, 0, 0.28)',
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div
                ref={mobileControllerRef}
                className="building-dialog-control-scroll absolute right-4 bottom-4 left-4 z-10 overflow-x-auto sm:hidden"
              >
                <div className="mx-auto flex w-max min-w-full justify-center">
                  <div className="flex gap-2 rounded-full px-3 py-2" style={floatingControlStyle}>
                    {imageUrls.map((imageUrl, index) => (
                      <button
                        type="button"
                        key={imageUrl}
                        ref={(element) => {
                          mobileItemRefs.current[index] = element;
                        }}
                        onClick={() => onSelectImage(index, imageUrls)}
                        aria-label={t('dialog.currentImage', {
                          current: index + 1,
                          total: imageUrls.length,
                        })}
                        className="shrink-0 rounded-full transition-all duration-200"
                        style={{
                          width: index === currentImageIndex ? '32px' : '8px',
                          height: '8px',
                          background:
                            index === currentImageIndex
                              ? 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)'
                              : 'rgba(255, 255, 255, 0.3)',
                        }}
                        onMouseEnter={(event) => {
                          if (index !== currentImageIndex) {
                            event.currentTarget.style.background = 'rgba(255, 255, 255, 0.5)';
                          }
                        }}
                        onMouseLeave={(event) => {
                          if (index !== currentImageIndex) {
                            event.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                          }
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </>
      ) : (
        <Building2 className="h-32 w-32" style={{ color: 'var(--theme-text-faint)' }} />
      )}
    </div>
  );
}

function BuildingDetailInfo({
  building,
  formatDate,
  getTagKey,
  locale,
  t,
}: {
  building: Building;
  formatDate: (timestamp: number | string) => string;
  getTagKey: (building: Building, tag: LocalizedText) => string;
  locale: string;
  t: BuildingsTranslator;
}) {
  return (
    <div
      className="w-full lg:w-[42%]"
      style={{ background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.08), rgba(0, 0, 0, 0.12))' }}
    >
      <div className="building-dialog-scrollbar flex h-full flex-col overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="space-y-4 rounded-[1.75rem] p-5 sm:p-6" style={detailPanelSurfaceStyle}>
          <h2
            className="mb-2 text-2xl font-bold sm:text-3xl lg:text-4xl"
            style={{ color: 'var(--theme-text-heading)' }}
          >
            {getBuildingName(building, locale)}
          </h2>

          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 backdrop-blur-md"
            style={{
              background: 'var(--theme-surface-modal-badge)',
              border: '1px solid var(--theme-border-modal-badge)',
              color: 'var(--theme-text-modal-badge)',
            }}
          >
            <BuildingTypeBadge buildType={building.buildType} t={t} />
          </div>

          <BuildingTags building={building} getTagKey={getTagKey} locale={locale} />
        </div>

        <div className="mt-4 rounded-[1.75rem] p-5 sm:p-6" style={detailPanelSurfaceStyle}>
          <p
            className="text-base leading-relaxed whitespace-pre-line"
            style={{ color: 'var(--theme-text-muted-soft)' }}
          >
            {getBuildingDescription(building, locale)}
          </p>
        </div>

        <div className="mt-4 rounded-[1.75rem] p-5 sm:p-6" style={detailPanelSurfaceStyle}>
          <BuildingDetailFacts
            building={building}
            formatDate={formatDate}
            locale={locale}
            separated={false}
            t={t}
          />
        </div>
      </div>
    </div>
  );
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

  useEffect(() => {
    if (!building) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (imageUrls.length < 2) {
        return;
      }

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

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [building, imageUrls.length, onClose, onNextImage, onPreviousImage]);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {building ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="safe-fixed-overlay fixed inset-0 flex items-start justify-center overflow-y-auto sm:items-center"
          style={{
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(32px) saturate(180%)',
            WebkitBackdropFilter: 'blur(32px) saturate(180%)',
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative my-auto flex w-full max-w-7xl flex-col gap-0 overflow-hidden rounded-[2rem] shadow-2xl lg:flex-row"
            style={{
              maxHeight:
                'min(56rem, calc(var(--viewport-height-dynamic) - var(--viewport-top-inset) - var(--viewport-bottom-inset) - 2rem))',
              background: 'var(--theme-surface-modal)',
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
              border: '1px solid var(--theme-border-modal)',
              boxShadow:
                '0 24px 64px var(--theme-shadow-modal), 0 8px 32px var(--theme-shadow-modal-soft), inset 0 1px 0 var(--theme-shadow-modal-inset)',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label={t('dialog.close')}
              title={t('dialog.close')}
              className="absolute top-4 right-4 z-20 rounded-full p-2 transition-all duration-200"
              style={floatingControlStyle}
              onMouseEnter={(event) => {
                event.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.background = 'var(--theme-surface-glass)';
              }}
            >
              <X className="h-6 w-6" style={{ color: 'var(--theme-text-primary)' }} />
            </button>

            <BuildingDetailGallery
              activeImage={activeImage}
              buildingName={getBuildingName(building, locale)}
              currentImageIndex={currentImageIndex}
              imageLoading={imageLoading}
              imageUrls={imageUrls}
              isImageError={isImageError}
              onImageError={onImageError}
              onImageLoad={onImageLoad}
              onNextImage={onNextImage}
              onPreviousImage={onPreviousImage}
              onSelectImage={onSelectImage}
              t={t}
              transitionDirection={imageTransitionDirection}
            />

            <div id={titleId} className="sr-only">
              {getBuildingName(building, locale)}
            </div>

            <BuildingDetailInfo
              building={building}
              formatDate={formatDate}
              getTagKey={getTagKey}
              locale={locale}
              t={t}
            />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
