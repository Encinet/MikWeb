import type { Metadata } from 'next';
import type { AppLocale } from '@/shared/i18n/routing';
import { SITE_NAME } from '@/site/config/site-config';

const OPEN_GRAPH_LOCALE_BY_APP_LOCALE: Record<AppLocale, string> = {
  'zh-CN': 'zh_CN',
  en: 'en_US',
};

function getLocalePath(locale: AppLocale, pathname = '') {
  return pathname ? `/${locale}${pathname}` : `/${locale}`;
}

function getLocaleSocialImagePath(locale: AppLocale) {
  return `${getLocalePath(locale)}/opengraph-image`;
}

export function buildPageMetadata({
  locale,
  title,
  description,
  pathname = '',
}: {
  locale: AppLocale;
  title: string;
  description: string;
  pathname?: string;
}): Metadata {
  const canonical = getLocalePath(locale, pathname);
  const imagePath = getLocaleSocialImagePath(locale);

  return {
    title,
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
      title,
      description,
      locale: OPEN_GRAPH_LOCALE_BY_APP_LOCALE[locale],
      alternateLocale: Object.entries(OPEN_GRAPH_LOCALE_BY_APP_LOCALE)
        .filter(([key]) => key !== locale)
        .map(([, ogLocale]) => ogLocale),
      images: [
        {
          url: imagePath,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imagePath],
    },
  };
}
