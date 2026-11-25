'use client';

import {
  type Ref,
  type RefObject,
  type SyntheticEvent,
  useEffect,
  useEffectEvent,
  useState,
} from 'react';

import {
  cachedBuildingPreview,
  hasBuildingOriginal,
  openBuildingOriginal,
  rememberBuildingDetailCover,
} from '../lib/building-image-preview';
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
  const [{ entry, resume }] = useState(() => {
    const entry = cachedBuildingPreview(image.jxl);
    return { entry, resume: Boolean(entry) || hasBuildingOriginal(image.jxl) };
  });
  const [preview, setPreview] = useState(entry?.source);
  const [mode, setMode] = useState<'range' | 'native' | 'webp'>(resume ? 'range' : 'native');
  const [withCors, setWithCors] = useState(true);
  const [blobUrl, setBlobUrl] = useState<string>();
  const [painted, setPainted] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const finished = (source: CanvasImageSource, width: number, height: number) => {
    setLoaded(true);
    onLoad();
    rememberBuildingDetailCover(image.jxl, source, width, height);
  };
  const finishDecode = useEffectEvent(finished);

  useEffect(() => {
    if (!resume) return;
    let mounted = true;
    let drawn: HTMLCanvasElement | undefined;
    let localUrl: string | undefined;
    void entry?.ready.then((source) => {
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
        drawn = canvas;
        setPainted(true);
      }
    });
    if (!request) {
      setMode('native');
      return;
    }
    request.result
      .then((blob) => {
        if (!mounted) return;
        if (!blob) setMode('native');
        else if (drawn) finishDecode(drawn, drawn.width, drawn.height);
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
  }, [entry, resume, image.jxl, canvasRef]);

  const props = {
    ref: imageRef,
    alt,
    draggable: false,
    fetchPriority: 'high' as const,
    onLoad: (event: SyntheticEvent<HTMLImageElement>) => {
      const source = event.currentTarget;
      finished(source, source.naturalWidth, source.naturalHeight);
    },
    className: 'absolute inset-0 h-full w-full object-contain',
  };
  const remoteProps = {
    ...props,
    crossOrigin: withCors ? ('anonymous' as const) : undefined,
    onError: () => {
      if (withCors) setWithCors(false);
      else onError();
    },
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
      {resume && (mode === 'range' || (painted && !loaded)) ? (
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
        <img key={String(withCors)} {...remoteProps} src={image.webp} />
      ) : (
        <BuildingPicture
          key={String(withCors)}
          {...remoteProps}
          image={image}
          fill
          loading="eager"
          decoding="auto"
        />
      )}
    </>
  );
}
