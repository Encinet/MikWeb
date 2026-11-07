import type { Metadata } from 'next';
import MapPage from '@/modules/map/ui/map-page';
import { requireRouteLocale } from '@/shared/i18n/route-locale';
import { generateSitePageMetadata } from '@/site/seo/site-page-metadata';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return generateSitePageMetadata(requireRouteLocale(locale), 'map');
}

export default MapPage;
