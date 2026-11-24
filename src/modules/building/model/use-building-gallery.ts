'use client';

import { useState } from 'react';
import { getBuildingPreviewUrl } from '@/modules/building/lib/building-links';

export interface BuildingGalleryState {
  imageIndex: number;
  loading: boolean;
  activeImage: string | undefined;
  activePreview: string | undefined;
  getThumbnailSrc: (url: string) => string | undefined;
  isImageError: (url: string) => boolean;
  handleImageError: (url: string) => void;
  handleImageLoad: (url: string) => void;
  retryImage: () => void;
  handleSelectImage: (index: number) => void;
  next: () => void;
  prev: () => void;
}

type ImageStatus = 'loaded' | 'error';

export function useBuildingGallery(images: string[], modal = false): BuildingGalleryState {
  const [selection, setSelection] = useState<{ url: string; index: number } | null>(null);
  const [imageStatus, setImageStatus] = useState(() => {
    const status = new Map<string, ImageStatus>();
    // The underlying page can already be displaying a cover when a gallery opens over it.
    if (modal && typeof document !== 'undefined') {
      for (const image of document.images) {
        if (image.complete && image.naturalWidth > 0) status.set(image.currentSrc, 'loaded');
      }
    }
    return status;
  });

  // A refreshed catalog may reorder or remove photos while the detail page stays mounted.
  const resolveIndex = (selected: typeof selection) =>
    !selected
      ? 0
      : images[selected.index] === selected.url
        ? selected.index
        : Math.max(0, images.indexOf(selected.url));
  const imageIndex = resolveIndex(selection);
  const activeImage = images[imageIndex];
  const loading = Boolean(activeImage && !imageStatus.has(activeImage));

  const isImageError = (url: string) => imageStatus.get(url) === 'error';

  const loadedPreview = (url: string) => {
    const cover = getBuildingPreviewUrl(url, 'cover');
    if (imageStatus.get(cover) === 'loaded') return cover;
    const small = getBuildingPreviewUrl(url, 'thumbnail');
    if (imageStatus.get(small) === 'loaded') return small;
  };

  const getThumbnailSrc = (url: string) => {
    const preview = loadedPreview(url);
    if (preview) return preview;
    if (imageStatus.get(url) === 'loaded') return url;
    // Let the stage finish its request before displaying the same original in the strip.
    if (url === activeImage) return;
    const small = getBuildingPreviewUrl(url, 'thumbnail');
    if (!isImageError(small)) return small;
  };

  const markImage = (url: string, status: ImageStatus) => {
    setImageStatus((previous) =>
      previous.get(url) === status ? previous : new Map(previous).set(url, status),
    );
  };

  const retryImage = () => {
    if (!activeImage) return;
    setImageStatus((previous) => {
      const next = new Map(previous);
      next.delete(activeImage);
      return next;
    });
  };

  const handleSelectImage = (index: number) => {
    if (!Number.isInteger(index) || index < 0 || index >= images.length) return;
    setSelection({ url: images[index], index });
  };

  const navigate = (dir: -1 | 1) => {
    if (images.length < 2) return;
    setSelection((previous) => {
      const index = (resolveIndex(previous) + dir + images.length) % images.length;
      return { url: images[index], index };
    });
  };

  const next = () => navigate(1);
  const prev = () => navigate(-1);

  return {
    imageIndex,
    loading,
    activeImage,
    activePreview: activeImage && loading ? loadedPreview(activeImage) : undefined,
    getThumbnailSrc,
    isImageError,
    handleImageError: (url) => markImage(url, 'error'),
    handleImageLoad: (url) => markImage(url, 'loaded'),
    retryImage,
    handleSelectImage,
    next,
    prev,
  };
}
