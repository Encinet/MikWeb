import 'server-only';

import { getTranslations } from 'next-intl/server';
import { cache } from 'react';
import type { AppLocale } from '@/shared/i18n/routing';
import { buildPageMetadata } from '@/site/seo/build-page-metadata';
import type { SitePage } from '@/site/seo/site-pages';
import { SITE_PAGES } from '@/site/seo/site-pages';

export const getSitePageContent = cache(async (locale: AppLocale, page: SitePage) => {
  const definition = SITE_PAGES[page];
  const t = await getTranslations({ locale });
  const title = t(definition.title);
  const description = t(definition.description);
  const imageDescription =
    'imageDescription' in definition ? t(definition.imageDescription) : description;

  return {
    pathname: definition.pathname,
    title,
    description,
    imageTitle: 'imageTitle' in definition ? t(definition.imageTitle) : title,
    imageDescription: imageDescription.trim().replace(/[.。]+$/u, ''),
    cover: 'cover' in definition ? definition.cover : undefined,
  };
});

export async function generateSitePageMetadata(locale: AppLocale, page: SitePage) {
  const { title, description, pathname, imageTitle, imageDescription } = await getSitePageContent(
    locale,
    page,
  );
  return {
    ...buildPageMetadata({
      locale,
      title,
      description,
      pathname,
      imageAlt: `${imageTitle.replace(/\s+/g, ' ')}${locale === 'zh-CN' ? '。' : '. '}${imageDescription}`,
      imagePath: page === 'home' ? `/${locale}/opengraph-image` : `/${locale}/opengraph/${page}`,
    }),
    ...(!('sitemap' in SITE_PAGES[page]) ? { robots: { index: false, follow: false } } : {}),
  };
}
