export function downscaleBuildingImage(
  source: CanvasImageSource,
  width: number,
  height: number,
  maxDimension: number,
  smoothingQuality: ImageSmoothingQuality = 'low',
) {
  if (width <= 0 || height <= 0) return null;
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.imageSmoothingQuality = smoothingQuality;
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}
