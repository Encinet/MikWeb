'use client';

import { useState } from 'react';
import type { BuildingImageUrls } from '@/modules/building/model/building-types';

export interface BuildingGalleryState {
  imageIndex: number;
  loading: boolean;
  activeImage: BuildingImageUrls | undefined;
  shouldShowThumbnail: (image: BuildingImageUrls) => boolean;
  isImageError: (image: BuildingImageUrls) => boolean;
  handleImageError: (image: BuildingImageUrls) => void;
  handleImageLoad: (image: BuildingImageUrls) => void;
  retryImage: () => void;
  handleSelectImage: (index: number) => void;
  next: () => void;
  prev: () => void;
}

type ImageStatus = 'loaded' | 'error';

function sameImage(left: BuildingImageUrls | undefined, right: BuildingImageUrls) {
  return left?.webp === right.webp && left.jxl === right.jxl;
}

export function useBuildingGallery(images: BuildingImageUrls[], modal = false): BuildingGalleryState {
  const [selection, setSelection] = useState<{ image: BuildingImageUrls; index: number } | null>(null);
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
      : sameImage(images[selected.index], selected.image)
        ? selected.index
        : Math.max(0, images.findIndex((image) => sameImage(image, selected.image)));
  const imageIndex = resolveIndex(selection);
  const activeImage = images[imageIndex];
  const statusFor = ({ webp, jxl }: BuildingImageUrls) =>
    imageStatus.get(webp) ?? (imageStatus.get(jxl) === 'loaded' ? 'loaded' : undefined);
  const loading = Boolean(activeImage && !statusFor(activeImage));

  const isImageError = (image: BuildingImageUrls) => statusFor(image) === 'error';

  // Let the stage finish its request before displaying the same original in the strip.
  const shouldShowThumbnail = (image: BuildingImageUrls) =>
    statusFor(image) === 'loaded' || (!sameImage(activeImage, image) && !isImageError(image));

  const markImage = (url: string, status: ImageStatus) => {
    setImageStatus((previous) =>
      previous.get(url) === status ? previous : new Map(previous).set(url, status),
    );
  };

  const retryImage = () => {
    if (!activeImage) return;
    setImageStatus((previous) => {
      const next = new Map(previous);
      next.delete(activeImage.webp);
      next.delete(activeImage.jxl);
      return next;
    });
  };

  const handleSelectImage = (index: number) => {
    if (!Number.isInteger(index) || index < 0 || index >= images.length) return;
    setSelection({ image: images[index], index });
  };

  const navigate = (dir: -1 | 1) => {
    if (images.length < 2) return;
    setSelection((previous) => {
      const index = (resolveIndex(previous) + dir + images.length) % images.length;
      return { image: images[index], index };
    });
  };

  const next = () => navigate(1);
  const prev = () => navigate(-1);

  return {
    imageIndex,
    loading,
    activeImage,
    shouldShowThumbnail,
    isImageError,
    handleImageError: (image) => markImage(image.webp, 'error'),
    handleImageLoad: (image) => markImage(image.webp, 'loaded'),
    retryImage,
    handleSelectImage,
    next,
    prev,
  };
}
