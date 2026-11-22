import 'server-only';

import { SITE_NAME, SITE_URL } from '@/shared/config/site-config';
import { readLimitedResponse } from '@/shared/lib/read-limited-response';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export async function readBuildingImage(url: string) {
  if (!url.startsWith('https://')) throw new Error('Building images must use HTTPS');
  const response = await fetch(url, {
    signal: AbortSignal.timeout(8000),
    headers: {
      Accept: 'image/webp',
      'User-Agent': `${SITE_NAME.replace(/\s+/g, '')}-Preview/1.0 (+${SITE_URL})`,
    },
  });
  const contentType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  if (!response.ok || contentType !== 'image/webp') {
    await response.body?.cancel().catch(() => {});
    throw new Error(`Building image rejected (${response.status})`);
  }
  return readLimitedResponse(response, MAX_IMAGE_BYTES);
}
