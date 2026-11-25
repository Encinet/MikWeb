'use client';

import { type Ref, type RefObject, useEffect, useEffectEvent, useState } from 'react';

import { cachedBuildingPreview, openBuildingOriginal } from '../lib/building-image-preview';
import type { BuildingImageUrls } from '../model/building-types';
import { BuildingPicture } from './building-picture';

export function BuildingDetailPicture({
  image,
  alt,
  imageRef,
  canvasRef,
  onLoad,
  onError,
}: {
  image: BuildingImageUrls;
  alt: string;
  imageRef: Ref<HTMLImageElement>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  onLoad: () => void;
  onError: () => void;
}) {
  const [entry] = useState(() => cachedBuildingPreview(image.jxl));
  const [preview, setPreview] = useState(entry?.source);
  const [mode, setMode] = useState<'range' | 'native' | 'webp'>(entry ? 'range' : 'native');
  const [blobUrl, setBlobUrl] = useState<string>();
  const [painted, setPainted] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const finished = () => {
    setLoaded(true);
    onLoad();
  };
  const finishDecode = useEffectEvent(finished);

  useEffect(() => {
    if (!entry) return;
    let mounted = true;
    let drawn = false;
    let localUrl: string | undefined;
    void entry.ready.then((source) => {
      if (mounted) setPreview(source);
    });
    const request = openBuildingOriginal(image.jxl, entry, (frame) => {
      const canvas = canvasRef.current;
      if (!mounted || !canvas) return;
      if (canvas.width !== frame.displayWidth) canvas.width = frame.displayWidth;
      if (canvas.height !== frame.displayHeight) canvas.height = frame.displayHeight;
      const context = canvas.getContext('2d');
      if (!context) return;
      // Replace the previous frame, including pixels which become transparent.
      context.globalCompositeOperation = 'copy';
      context.drawImage(frame, 0, 0);
      if (!drawn) {
        drawn = true;
        setPainted(true);
      }
    });
    request.result
      .then((blob) => {
        if (!mounted) return;
        if (!blob) setMode('native');
        else if (drawn) finishDecode();
        else {
          localUrl = URL.createObjectURL(blob);
          setBlobUrl(localUrl);
        }
      })
      .catch(() => {
        if (mounted) setMode('webp');
      });
    return () => {
      mounted = false;
      request.release();
      if (localUrl) URL.revokeObjectURL(localUrl);
    };
  }, [entry, image.jxl, canvasRef]);

  const props = {
    ref: imageRef,
    alt,
    draggable: false,
    fetchPriority: 'high' as const,
    onLoad: finished,
    onError,
    className: 'absolute inset-0 h-full w-full object-contain',
  };
  const thumbnail = preview === null ? image.thumbnailWebp : preview;
  return (
    <>
      {thumbnail && !loaded && !painted ? (
        <img
          src={thumbnail}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="absolute inset-0 h-full w-full object-contain"
          data-preview-visible={previewVisible || undefined}
          onLoad={() => setPreviewVisible(true)}
        />
      ) : null}
      {entry && (mode === 'range' || (painted && !loaded)) ? (
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={alt}
          hidden={!painted}
          data-preview-visible={painted || undefined}
          className="absolute inset-0 h-full w-full object-contain"
        />
      ) : null}
      {mode === 'range' ? (
        blobUrl ? (
          <img {...props} src={blobUrl} onError={() => setMode('webp')} />
        ) : null
      ) : mode === 'webp' ? (
        <img {...props} src={image.webp} />
      ) : (
        <BuildingPicture {...props} image={image} fill loading="eager" decoding="auto" />
      )}
    </>
  );
}
