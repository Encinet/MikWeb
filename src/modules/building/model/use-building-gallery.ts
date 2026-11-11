'use client';

import { useState } from 'react';

import type { Building } from '@/modules/building/model/building-types';

export interface BuildingGalleryState {
  imageIndex: number;
  loading: boolean;
  activeImage: string | undefined;
  isImageError: (url: string) => boolean;
  handleImageError: (url: string) => void;
  handleImageLoad: (url: string) => void;
  retryImage: () => void;
  handleSelectImage: (index: number) => void;
  next: () => void;
  prev: () => void;
}

export function useBuildingGallery(building: Building): BuildingGalleryState {
  const [selection, setSelection] = useState<{ url: string; index: number } | null>(null);
  const [loaded, setLoaded] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Set<string>>(new Set());

  const images = building.images;
  // A refreshed catalog may reorder or remove photos while the detail page stays mounted.
  const resolveIndex = (selected: typeof selection) =>
    !selected
      ? 0
      : images[selected.index] === selected.url
        ? selected.index
        : Math.max(0, images.indexOf(selected.url));
  const imageIndex = resolveIndex(selection);
  const activeImage = images[imageIndex];
  const loading = Boolean(activeImage && !loaded.has(activeImage) && !errors.has(activeImage));

  const isImageError = (url: string) => errors.has(url);

  const handleImageError = (url: string) => {
    setErrors((prev) => new Set(prev).add(url));
  };

  const handleImageLoad = (url: string) => {
    setLoaded((previous) => new Set(previous).add(url));
    setErrors((previous) => {
      if (!previous.has(url)) return previous;
      const next = new Set(previous);
      next.delete(url);
      return next;
    });
  };

  const retryImage = () => {
    if (!activeImage) return;
    setErrors((previous) => {
      const next = new Set(previous);
      next.delete(activeImage);
      return next;
    });
    setLoaded((previous) => {
      const next = new Set(previous);
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
    isImageError,
    handleImageError,
    handleImageLoad,
    retryImage,
    handleSelectImage,
    next,
    prev,
  };
}
