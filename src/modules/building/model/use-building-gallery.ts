'use client';

import { useState } from 'react';

import type { Building } from '@/modules/building/model/building-types';

export interface BuildingGalleryState {
  imageIndex: number;
  direction: -1 | 1;
  loading: boolean;
  activeImage: string | undefined;
  isImageError: (url: string) => boolean;
  handleImageError: (url: string) => void;
  handleImageLoad: (url: string) => void;
  handleSelectImage: (index: number, dir?: -1 | 1) => void;
  next: () => void;
  prev: () => void;
}

export function useBuildingGallery(building: Building): BuildingGalleryState {
  const [imageIndex, setImageIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [loaded, setLoaded] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Set<string>>(new Set());

  const images = building.images;
  const activeImage = images[imageIndex];
  const loading = Boolean(activeImage && !loaded.has(activeImage) && !errors.has(activeImage));

  const isImageError = (url: string) => errors.has(url);

  const handleImageError = (url: string) => {
    setErrors((prev) => new Set(prev).add(url));
  };

  const handleImageLoad = (url: string) => {
    setLoaded((previous) => new Set(previous).add(url));
  };

  const handleSelectImage = (index: number, dir: -1 | 1 = index >= imageIndex ? 1 : -1) => {
    if (!Number.isInteger(index) || index < 0 || index >= images.length) return;
    setDirection(dir);
    setImageIndex(index);
  };

  const navigate = (dir: -1 | 1) => {
    if (images.length < 2) return;
    setDirection(dir);
    setImageIndex((previous) => (previous + dir + images.length) % images.length);
  };

  const next = () => navigate(1);
  const prev = () => navigate(-1);

  return {
    imageIndex,
    direction,
    loading,
    activeImage,
    isImageError,
    handleImageError,
    handleImageLoad,
    handleSelectImage,
    next,
    prev,
  };
}
