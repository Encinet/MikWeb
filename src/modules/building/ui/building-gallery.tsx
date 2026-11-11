'use client';

import { ArrowLeft, X } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { useLocale, useTranslations } from 'next-intl';
import {
  addTransitionType,
  startTransition,
  useEffect,
  useEffectEvent,
  useId,
  useState,
  ViewTransition,
} from 'react';
import { getBuildingName } from '@/modules/building/lib/building-view-helpers';
import type { Building } from '@/modules/building/model/building-types';
import { useBuildingGallery } from '@/modules/building/model/use-building-gallery';
import { useBuildingGalleryControls } from '@/modules/building/model/use-building-gallery-controls';
import { BuildingGalleryDetails } from '@/modules/building/ui/building-gallery-details';
import { BuildingGalleryFrame } from '@/modules/building/ui/building-gallery-frame';
import { BuildingGalleryViewer } from '@/modules/building/ui/building-gallery-viewer';
import { BuildingPreviewImage } from '@/modules/building/ui/building-preview-image';
import { BuildingShareActions } from '@/modules/building/ui/building-share-actions';
import { Link, useRouter } from '@/shared/i18n/navigation';

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
  const titleId = useId();
  const gallery = useBuildingGallery(building);
  const reduceMotion = useReducedMotion();
  const [focused, setFocused] = useState(false);
  const [thumbnailErrors, setThumbnailErrors] = useState<Set<string>>(new Set());
  const { stageRef, thumbnailsRef } = useBuildingGalleryControls({
    imageIndex: gallery.imageIndex,
    imageCount: building.images.length,
    next: gallery.next,
    prev: gallery.prev,
    reduceMotion: Boolean(reduceMotion),
  });
  const name = getBuildingName(building, locale);
  const close = () => router.back();
  const changeFocus = (next: boolean) => {
    if (reduceMotion) {
      setFocused(next);
      return;
    }
    startTransition(() => {
      addTransitionType('building-focus');
      setFocused(next);
    });
  };
  const handleEscape = () => {
    if (focused) changeFocus(false);
    else if (modal) close();
  };
  const onDirectEscape = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === 'Escape' && focused) {
      event.preventDefault();
      changeFocus(false);
    }
  });
  useEffect(() => {
    if (modal) return;
    const handle = (event: KeyboardEvent) => onDirectEscape(event);
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [modal]);

  return (
    <BuildingGalleryFrame
      modal={modal}
      onClose={close}
      onEscape={handleEscape}
      titleId={titleId}
      focused={focused}
    >
      <div className="building-gallery-toolbar">
        {!modal ? (
          <Link
            href="/buildings"
            className="building-gallery-back"
            scroll={false}
            transitionTypes={['building-close']}
          >
            <ArrowLeft aria-hidden="true" />
            <span>{t('title')}</span>
          </Link>
        ) : (
          <span className="building-gallery-toolbar__name">{name}</span>
        )}
        <div className="building-gallery-toolbar__actions">
          <BuildingShareActions building={building} />
          {modal ? (
            <button
              type="button"
              onClick={close}
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

      <BuildingGalleryViewer
        gallery={gallery}
        imageCount={building.images.length}
        stageRef={stageRef}
        name={name}
        focused={focused}
        onToggleFocus={() => changeFocus(!focused)}
      >
        {building.images.length > 0 ? (
          <ViewTransition
            default={{ default: 'none', 'building-focus': 'building-controls-focus' }}
          >
            <div className="building-gallery-filmstrip">
              <p
                className="building-archive-image-picker__count"
                aria-live="polite"
                aria-atomic="true"
              >
                <span className="sr-only">
                  {t('dialog.currentImage', {
                    current: gallery.imageIndex + 1,
                    total: building.images.length,
                  })}
                </span>
                <span aria-hidden="true">
                  <strong>{String(gallery.imageIndex + 1).padStart(2, '0')}</strong> /{' '}
                  {String(building.images.length).padStart(2, '0')}
                </span>
              </p>
              {building.images.length > 1 ? (
                <section
                  ref={thumbnailsRef}
                  className="building-archive-thumbnails"
                  aria-label={t('viewer.thumbnails')}
                >
                  {building.images.map((url, index) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => gallery.handleSelectImage(index)}
                      aria-label={t('dialog.currentImage', {
                        current: index + 1,
                        total: building.images.length,
                      })}
                      aria-pressed={index === gallery.imageIndex}
                      className={index === gallery.imageIndex ? 'is-active' : ''}
                    >
                      {thumbnailErrors.has(url) ? (
                        <span>{index + 1}</span>
                      ) : (
                        <BuildingPreviewImage
                          building={building}
                          imageIndex={index}
                          alt=""
                          sizes="72px"
                          className="object-cover"
                          loading="lazy"
                          fetchPriority="low"
                          onError={() =>
                            setThumbnailErrors((previous) => new Set(previous).add(url))
                          }
                        />
                      )}
                    </button>
                  ))}
                </section>
              ) : null}
            </div>
          </ViewTransition>
        ) : null}
      </BuildingGalleryViewer>

      <ViewTransition default={{ default: 'none', 'building-focus': 'building-details-focus' }}>
        <div className="building-archive-info-bar-frame" hidden={focused}>
          <BuildingGalleryDetails building={building} titleId={titleId} modal={modal} />
        </div>
      </ViewTransition>
    </BuildingGalleryFrame>
  );
}
