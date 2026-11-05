'use client';

import { useState } from 'react';

import type { Building } from '@/modules/building/model/building-types';

export interface BuildingDialogState {
  building: Building | null;
  imageIndex: number;
  direction: -1 | 1;
  loading: boolean;
  activeImage: string | undefined;
  isImageError: (url: string) => boolean;
  handleImageError: (url: string) => void;
  handleImageLoad: () => void;
  handleSelectImage: (index: number, dir?: -1 | 1) => void;
  open: (b: Building) => void;
  close: () => void;
  next: () => void;
  prev: () => void;
}

export function useBuildingDialog(): BuildingDialogState {
  const [building, setBuilding] = useState<Building | null>(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [direction, setDirection] = useState<-1 | 1>(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Set<string>>(new Set());

  const images = building?.images ?? [];
  const activeImage = images[imageIndex];

  const isImageError = (url: string) => errors.has(url);

  const handleImageError = (url: string) => {
    setErrors((prev) => new Set(prev).add(url));
    if (url === activeImage) setLoading(false);
  };

  const handleImageLoad = () => {
    setLoading(false);
  };

  const syncImageLoading = (url: string | undefined) => {
    if (!url || errors.has(url)) {
      setLoading(false);
      return;
    }

    const image = new globalThis.Image();
    image.src = url;
    setLoading(!image.complete);
  };

  const handleSelectImage = (index: number, dir: -1 | 1 = index >= imageIndex ? 1 : -1) => {
    syncImageLoading(images[index]);
    setDirection(dir);
    setImageIndex(index);
  };

  const open = (b: Building) => {
    syncImageLoading(b.images[0]);
    setBuilding(b);
    setDirection(1);
    setImageIndex(0);
  };

  const close = () => {
    setBuilding(null);
    setLoading(false);
    setDirection(1);
    setImageIndex(0);
  };

  const next = () => {
    if (building && images.length > 0) {
      const nextIndex = (imageIndex + 1) % images.length;
      handleSelectImage(nextIndex, 1);
    }
  };

  const prev = () => {
    if (building && images.length > 0) {
      const prevIndex = (imageIndex - 1 + images.length) % images.length;
      handleSelectImage(prevIndex, -1);
    }
  };

  return {
    building,
    imageIndex,
    direction,
    loading,
    activeImage,
    isImageError,
    handleImageError,
    handleImageLoad,
    handleSelectImage,
    open,
    close,
    next,
    prev,
  };
}
