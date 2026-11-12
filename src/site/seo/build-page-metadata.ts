import type { Metadata } from 'next';
import { SITE_NAME } from '@/shared/config/site-config';
import type { AppLocale } from '@/shared/i18n/routing';
import { formatPageTitle } from '@/site/seo/page-title';
import { SOCIAL_IMAGE_SIZE } from '@/site/seo/social-image/social-image-config';

const OPEN_GRAPH_LOCALE_BY_APP_LOCALE: Record<AppLocale, string> = {
  'zh-CN': 'zh_CN',
  en: 'en_US',
};

function getLocalePath(locale: AppLocale, pathname = '') {
  return pathname ? `/${locale}${pathname}` : `/${locale}`;
}

export function buildPageMetadata({
  locale,
  title,
  description,
  pathname = '',
  imagePath = `/${locale}/opengraph-image`,
  imageAlt = title,
}: {
  locale: AppLocale;
  title: string;
  description: string;
  pathname?: string;
  imagePath?: string;
  imageAlt?: string;
}) {
  const canonical = getLocalePath(locale, pathname);
  const image = { url: imagePath, ...SOCIAL_IMAGE_SIZE, alt: imageAlt, type: 'image/png' };
  const documentTitle = formatPageTitle(title, { home: pathname === '' });

  return {
    title: { absolute: documentTitle },
    description,
    alternates: {
      canonical,
      languages: {
        'zh-CN': getLocalePath('zh-CN', pathname),
        en: getLocalePath('en', pathname),
      },
    },
    openGraph: {
      type: 'website',
      url: canonical,
      siteName: SITE_NAME,
      title: documentTitle,
      description,
      locale: OPEN_GRAPH_LOCALE_BY_APP_LOCALE[locale],
      alternateLocale: Object.entries(OPEN_GRAPH_LOCALE_BY_APP_LOCALE)
        .filter(([key]) => key !== locale)
        .map(([, ogLocale]) => ogLocale),
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title: documentTitle,
      description,
      images: [image],
    },
  } satisfies Metadata;
}
