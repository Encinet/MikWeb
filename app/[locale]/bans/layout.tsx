import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { buildPageMetadata } from '@/lib/metadata';
import { requireRouteLocale } from '@/lib/routeLocale';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = requireRouteLocale(rawLocale);
  const t = await getTranslations({ locale, namespace: 'bans' });

  return buildPageMetadata({
    locale,
    title: t('title'),
    description: t('description'),
    pathname: '/bans',
  });
}

export default function BansLayout({ children }: { children: React.ReactNode }) {
  return children;
}
