import type { MetadataRoute } from 'next';

import { SITE_URL } from '@/shared/config/site-config';
import { routing } from '@/shared/i18n/routing';

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = [
    '',
    '/buildings',
    '/wiki',
    '/map',
    '/community/notices',
    '/bans',
    '/pcl2',
    '/mcp',
  ];

  return staticPages.flatMap((page) => {
    const languages = Object.fromEntries(
      routing.locales.map((locale) => [locale, `${SITE_URL}/${locale}${page}`]),
    );
    return routing.locales.map((locale) => ({
      url: languages[locale],
      alternates: { languages },
      changeFrequency: page === '' ? 'daily' : 'weekly',
      priority: page === '' ? 1 : 0.8,
    }));
  });
}
