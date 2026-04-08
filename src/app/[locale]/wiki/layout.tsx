import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { requireRouteLocale } from '@/shared/i18n/route-locale';
import { buildPageMetadata } from '@/site/seo/build-page-metadata';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = requireRouteLocale(rawLocale);
  const t = await getTranslations({ locale, namespace: 'wiki' });

  return buildPageMetadata({
    locale,
    title: t('meta.title'),
    description: t('meta.description'),
    pathname: '/wiki',
  });
}

export default function WikiLayout({ children }: { children: React.ReactNode }) {
  return children;
}
