import './globals.css';

import { getTranslations } from 'next-intl/server';
import { cache } from 'react';
import { getRequestLocale } from '@/shared/i18n/request-locale';
import SiteDocument from '@/site/layout/site-document';
import NotFoundView from '@/site/not-found/ui/not-found-view';
import { formatPageTitle } from '@/site/seo/page-title';
import { siteMetadata } from '@/site/seo/site-metadata';

// The document language is resolved from this request's cookie and headers.
export const instant = false;

const getNotFoundContent = cache(async () => {
  const locale = await getRequestLocale();
  const t = await getTranslations({ locale, namespace: 'notFound' });
  return {
    locale,
    title: t('hero.title'),
    description: t('hero.description'),
    homeLabel: t('actions.returnHome'),
  };
});

export async function generateMetadata() {
  const { title, description } = await getNotFoundContent();
  return {
    ...siteMetadata,
    title: formatPageTitle(title),
    description,
    robots: { index: false, follow: false },
  };
}

export default async function GlobalNotFound() {
  const { locale, title, description, homeLabel } = await getNotFoundContent();
  return (
    <SiteDocument locale={locale}>
      <main className="relative z-10 flex min-h-0 flex-1 flex-col">
        <NotFoundView
          title={title}
          description={description}
          homeHref={`/${locale}`}
          homeLabel={homeLabel}
        />
      </main>
    </SiteDocument>
  );
}
