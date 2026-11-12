import 'server-only';

import { cacheLife } from 'next/cache';
import sharp from 'sharp';
import { SITE_NAME, SITE_URL } from '@/shared/config/site-config';
import { readLimitedResponse } from '@/shared/lib/read-limited-response';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const RASTER_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
]);

/** Normalize a registered catalog image. Failures must propagate so ISR keeps its last good output. */
export async function readBuildingImage(url: string) {
  'use cache';
  cacheLife('days');
  if (!url.startsWith('https://')) throw new Error('Building images must use HTTPS');
  const response = await fetch(url, {
    signal: AbortSignal.timeout(8000),
    headers: {
      Accept: 'image/webp,image/png,image/jpeg',
      'User-Agent': `${SITE_NAME.replace(/\s+/g, '')}-Preview/1.0 (+${SITE_URL})`,
    },
  });
  const contentType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  if (!response.ok || !contentType || !RASTER_IMAGE_TYPES.has(contentType)) {
    await response.body?.cancel().catch(() => {});
    throw new Error(`Building image rejected (${response.status})`);
  }
  const source = await readLimitedResponse(response, MAX_IMAGE_BYTES);
  return new Uint8Array(
    await sharp(source, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize(2400, 2400, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer(),
  );
}
