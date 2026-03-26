import type { MetadataRoute } from 'next';

import { routing } from '@/i18n/routing';
import { fetchValidatedJson } from '@/lib/clientApi';
import { SITE_URL } from '@/lib/site';
import { getLocalizedText, isBuildingArray } from '@/lib/types';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticPages = ['', '/buildings', '/wiki', '/bans'];

  const locales = routing.locales;

  // Generate URLs for all locales
  const urls: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    for (const page of staticPages) {
      urls.push({
        url: `${SITE_URL}/${locale}${page}`,
        lastModified: new Date(),
        changeFrequency: page === '' ? 'daily' : 'weekly',
        priority: page === '' ? 1 : 0.8,
      });
    }
  }

  // Fetch buildings for dynamic pages
  const result = await fetchValidatedJson({
    url: `${SITE_URL}/api/buildings`,
    validate: isBuildingArray,
    timeoutMs: 15_000,
    fallbackErrorMessage: 'Failed to load buildings for sitemap',
  });

  if (result.status === 'success') {
    for (const locale of locales) {
      result.data.forEach((building) => {
        const buildingAnchor = encodeURIComponent(getLocalizedText(building.name, 'en'));
        const buildDate = building.buildDate ? new Date(building.buildDate) : new Date();
        urls.push({
          url: `${SITE_URL}/${locale}/buildings#${buildingAnchor}`,
          lastModified: buildDate,
          changeFrequency: 'monthly',
          priority: 0.6,
        });
      });
    }
  } else if (result.status === 'network-error') {
    console.error('Failed to fetch buildings for sitemap:', result.cause);
  } else {
    console.error(result.error);
  }

  return urls;
}
