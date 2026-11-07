import type { Metadata } from 'next';
import { requireRouteLocale } from '@/shared/i18n/route-locale';
import { generateSitePageMetadata } from '@/site/seo/site-page-metadata';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = requireRouteLocale(rawLocale);
  return generateSitePageMetadata(locale, 'community');
}

export default function CommunityNoticesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
