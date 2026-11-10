import type { MetadataRoute } from 'next';
import { cacheLife } from 'next/cache';
import { PHASE_PRODUCTION_BUILD } from 'next/constants';

import { getBuildingUrl } from '@/modules/building/lib/building-links';
import type { Building } from '@/modules/building/model/building-types';
import { getBuildingCatalog } from '@/modules/building/server/building-queries';
import { SITE_URL } from '@/shared/config/site-config';
import { routing } from '@/shared/i18n/routing';
import { SITEMAP_PATHS } from '@/site/seo/site-pages';

// Prerender at build time, then refresh in the background as the catalog changes.
const REVALIDATE_SECONDS = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  'use cache';
  cacheLife('days');
  const staticEntries: MetadataRoute.Sitemap = SITEMAP_PATHS.flatMap((page) => {
    const languages = Object.fromEntries(
      routing.locales.map((locale) => [locale, `${SITE_URL}/${locale}${page}`]),
    );
    return routing.locales.map((locale) => ({
      url: languages[locale],
      alternates: { languages },
      changeFrequency: page === '' ? ('daily' as const) : ('weekly' as const),
      priority: page === '' ? 1 : 0.8,
    }));
  });
  let buildings: Building[];
  try {
    buildings = await getBuildingCatalog(REVALIDATE_SECONDS);
  } catch (error) {
    // At runtime, let ISR retain the complete sitemap instead of caching a partial replacement.
    if (process.env.NEXT_PHASE !== PHASE_PRODUCTION_BUILD) throw error;
    console.warn('Building sitemap unavailable; serving static pages', error);
    return staticEntries;
  }
  const buildingEntries: MetadataRoute.Sitemap = buildings.flatMap((building) => {
    const languages = Object.fromEntries(
      routing.locales.map((locale) => [locale, getBuildingUrl(building.id, locale)]),
    );
    return routing.locales.map((locale) => ({
      url: languages[locale],
      alternates: { languages },
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }));
  });
  return [...staticEntries, ...buildingEntries];
}
