export interface ImageTransform {
  scale: number;
  x: number;
  y: number;
}

export interface ImageViewport {
  width: number;
  height: number;
  imageWidth: number;
  imageHeight: number;
}

export const MAX_IMAGE_SCALE = 5;
export const INITIAL_IMAGE_TRANSFORM: ImageTransform = { scale: 1, x: 0, y: 0 };

/** Bound movement to the visible, contained image rather than its letterboxed element. */
export function constrainImageTransform(
  transform: ImageTransform,
  viewport: ImageViewport,
): ImageTransform {
  const scale = Math.min(MAX_IMAGE_SCALE, Math.max(1, transform.scale));
  if (scale === 1) return INITIAL_IMAGE_TRANSFORM;
  const fit = Math.min(
    viewport.width / (viewport.imageWidth || viewport.width),
    viewport.height / (viewport.imageHeight || viewport.height),
  );
  const maxX = Math.max(
    0,
    ((viewport.imageWidth || viewport.width) * fit * scale - viewport.width) / 2,
  );
  const maxY = Math.max(
    0,
    ((viewport.imageHeight || viewport.height) * fit * scale - viewport.height) / 2,
  );
  return {
    scale,
    x: Math.min(maxX, Math.max(-maxX, transform.x)),
    y: Math.min(maxY, Math.max(-maxY, transform.y)),
  };
}

/** Keep the image point under the pointer stationary as the scale changes. */
export function scaleImageAtPoint(
  transform: ImageTransform,
  scale: number,
  point: { x: number; y: number },
  viewport: ImageViewport,
): ImageTransform {
  const nextScale = Math.min(MAX_IMAGE_SCALE, Math.max(1, scale));
  const ratio = nextScale / transform.scale;
  return constrainImageTransform(
    {
      scale: nextScale,
      x: point.x - (point.x - transform.x) * ratio,
      y: point.y - (point.y - transform.y) * ratio,
    },
    viewport,
  );
}
