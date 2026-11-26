'use client';

import { useEffect, useRef, useState } from 'react';

import {
  cachedBuildingPreview,
  prepareBuildingPreview,
  watchBuildingDetailCover,
} from '../lib/building-image-preview';
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
  const { jxl, thumbnailWebp, jxlPreviewBytes } = image;
  useEffect(() => {
    let mounted = true;
    let observer: IntersectionObserver | undefined;
    let stopWatching: (() => void) | undefined;
    let detailUrl: string | undefined;
    const visible = () => {
      if (!mounted || stopWatching) return;
      observer?.disconnect();
      stopWatching = watchBuildingDetailCover(jxl, (cover) => {
        if (detailUrl) URL.revokeObjectURL(detailUrl);
        detailUrl = URL.createObjectURL(cover);
        setSource(detailUrl);
      });
      // The prioritized thumbnail is already in the HTML. Its JXL prefix starts on navigation.
      if (detailUrl || eager) return;
      const entry = filmstrip
        ? cachedBuildingPreview(jxl)
        : prepareBuildingPreview({ jxl, jxlPreviewBytes });
      if (entry) {
        void entry.ready.then((preview) => {
          if (mounted && !detailUrl) setSource(preview ?? thumbnailWebp);
        });
      } else setSource(thumbnailWebp);
    };
    if (
      eager ||
      filmstrip ||
      typeof ImageDecoder === 'undefined' ||
      !container.current ||
      typeof IntersectionObserver === 'undefined'
    )
      visible();
    else {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((item) => item.isIntersecting)) visible();
        },
        { rootMargin: '160px' },
      );
      observer.observe(container.current);
    }
    return () => {
      mounted = false;
      observer?.disconnect();
      stopWatching?.();
      if (detailUrl) URL.revokeObjectURL(detailUrl);
    };
  }, [jxl, thumbnailWebp, jxlPreviewBytes, eager, filmstrip]);

  const displayedSource = source ?? (eager ? thumbnailWebp : undefined);
  return (
    <span ref={container} className="absolute inset-0">
      {!eager ? (
        <noscript>
          <img src={thumbnailWebp} alt={alt} loading="lazy" className="h-full w-full object-cover" />
        </noscript>
      ) : null}
      {displayedSource ? (
        <img
          src={displayedSource}
          alt={alt}
          className="h-full w-full object-cover"
          loading={eager ? 'eager' : 'lazy'}
          fetchPriority={eager ? 'high' : undefined}
          decoding="async"
          onError={() => {
            if (displayedSource.startsWith('blob:')) setSource(thumbnailWebp);
            else onError?.();
          }}
        />
      ) : null}
    </span>
  );
}
