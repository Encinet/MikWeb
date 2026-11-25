'use client';

import { useEffect, useRef, useState } from 'react';

import { cachedBuildingPreview, prepareBuildingPreview } from '../lib/building-image-preview';
import type { BuildingImageUrls } from '../model/building-types';

interface CoverProps {
  image: BuildingImageUrls;
  alt: string;
  eager?: boolean;
  filmstrip?: boolean;
  onError?: () => void;
}

export function BuildingCover({
  image,
  alt,
  eager = false,
  filmstrip = false,
  onError,
}: CoverProps) {
  const container = useRef<HTMLSpanElement>(null);
  const [source, setSource] = useState<string>();
  const { webp, jxl, thumbnailWebp, jxlPreviewBytes } = image;
  useEffect(() => {
    const photo = { webp, jxl, thumbnailWebp, jxlPreviewBytes };
    let mounted = true;
    const display = (preview: string | null) => {
      if (mounted) setSource(preview ?? thumbnailWebp);
    };
    const visible = () => {
      const entry = filmstrip ? cachedBuildingPreview(jxl) : prepareBuildingPreview(photo);
      if (entry) void entry.ready.then(display);
      else display(null);
    };
    if (
      eager ||
      filmstrip ||
      typeof ImageDecoder === 'undefined' ||
      !container.current ||
      typeof IntersectionObserver === 'undefined'
    ) {
      visible();
      return () => {
        mounted = false;
      };
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((item) => item.isIntersecting)) {
          visible();
        }
      },
      { rootMargin: '160px' },
    );
    observer.observe(container.current);
    return () => {
      mounted = false;
      observer.disconnect();
    };
  }, [webp, jxl, thumbnailWebp, jxlPreviewBytes, eager, filmstrip]);

  return (
    <span ref={container} className="absolute inset-0">
      <noscript>
        <img
          src={thumbnailWebp}
          alt={alt}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </noscript>
      {source ? (
        <img
          src={source}
          alt={alt}
          className="h-full w-full object-cover"
          loading={eager ? 'eager' : 'lazy'}
          fetchPriority={eager ? 'high' : 'auto'}
          decoding="async"
          onError={onError}
        />
      ) : null}
    </span>
  );
}
