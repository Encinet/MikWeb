import { getBuilding } from '@/modules/building/server/building-queries';
import { BuildingGallery } from '@/modules/building/ui/building-gallery';
import { requireRouteLocale } from '@/shared/i18n/route-locale';

export { generateBuildingMetadata as generateMetadata } from '@/site/seo/build-building-metadata';

export default async function BuildingPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  requireRouteLocale(locale);
  return <BuildingGallery key={id} building={await getBuilding(id)} />;
}
