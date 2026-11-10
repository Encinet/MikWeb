import 'server-only';

import { cacheLife } from 'next/cache';
import { getBuilding } from '@/modules/building/server/building-queries';
import type { AppLocale } from '@/shared/i18n/routing';
import type { SitePage } from '@/site/seo/site-pages';
import { createBuildingSocialImage } from '@/site/seo/social-image/building-social-image';
import {
  createBuildingShareThumbnail,
  createSiteShareThumbnail,
} from '@/site/seo/social-image/share-thumbnail';
import { createSocialImage } from '@/site/seo/social-image/site-social-image';

export async function getSiteSocialImage(locale: AppLocale, page: SitePage = 'home') {
  'use cache';
  cacheLife('max');
  return new Uint8Array(await (await createSocialImage(locale, page)).arrayBuffer());
}

export async function getSiteShareThumbnail(locale: AppLocale, page: SitePage) {
  'use cache';
  cacheLife('max');
  return new Uint8Array(await (await createSiteShareThumbnail(locale, page)).arrayBuffer());
}

export async function getBuildingSocialImage(id: string, locale: AppLocale) {
  'use cache';
  cacheLife('days');
  const building = await getBuilding(id, 86400);
  return new Uint8Array(await (await createBuildingSocialImage(building, locale)).arrayBuffer());
}

export async function getBuildingShareThumbnail(id: string) {
  'use cache';
  cacheLife('days');
  return new Uint8Array(
    await (await createBuildingShareThumbnail(await getBuilding(id, 86400))).arrayBuffer(),
  );
}

export function socialImageResponse(image: Uint8Array<ArrayBuffer>) {
  return new Response(image, {
    headers: {
      'Content-Type': 'image/png',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
