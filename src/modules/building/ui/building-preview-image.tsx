'use client';

import type { ImageProps } from 'next/image';
import Image from 'next/image';
import { useState } from 'react';
import { getBuildingImagePath } from '@/modules/building/lib/building-links';
import type { Building } from '@/modules/building/model/building-types';

type BuildingPreviewImageProps = Omit<ImageProps, 'src' | 'fill' | 'loader' | 'unoptimized'> & {
  building: Pick<Building, 'id' | 'images'>;
  imageIndex: number;
};

/** Responsive previews use only registered images; the original remains a network fallback. */
export function BuildingPreviewImage({
  building,
  imageIndex,
  onError,
  ...props
}: BuildingPreviewImageProps) {
  const source = getBuildingImagePath(building.id, imageIndex);
  const original = building.images[imageIndex];
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const useOriginal = failedSource === source;

  if (!original) return null;

  return (
    <Image
      {...props}
      src={useOriginal ? original : source}
      fill
      unoptimized={useOriginal}
      onError={(event) => {
        if (!useOriginal) setFailedSource(source);
        else onError?.(event);
      }}
    />
  );
}
