import '../../styles/modules/sponsors.css';

import type { Metadata } from 'next';

import { ClientMessages } from '@/shared/i18n/client-messages';
import { requireRouteLocale } from '@/shared/i18n/route-locale';
import { generateSitePageMetadata } from '@/site/seo/site-page-metadata';
import { SiteShareMetadata } from '@/site/seo/site-share-metadata';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = requireRouteLocale(rawLocale);
  return generateSitePageMetadata(locale, 'sponsor');
}

export default async function SponsorsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = requireRouteLocale(rawLocale);
  return (
    <>
      <SiteShareMetadata locale={locale} page="sponsor" />
      <ClientMessages locale={locale} namespaces={['sponsors']}>
        {children}
      </ClientMessages>
    </>
  );
}
