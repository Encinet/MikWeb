import { getBuilding } from '@/modules/building/server/building-queries';
import { BuildingGallery } from '@/modules/building/ui/building-gallery';
import { requireRouteLocale } from '@/shared/i18n/route-locale';
import { getBuildingMetadataContent } from '@/site/seo/build-building-metadata';
import { ShareTextMetadata } from '@/site/seo/share-text-metadata';

export { generateBuildingMetadata as generateMetadata } from '@/site/seo/build-building-metadata';

export default async function BuildingDialogPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const routeLocale = requireRouteLocale(locale);
  const building = await getBuilding(id);
  const content = getBuildingMetadataContent(building, routeLocale);
  return (
    <>
      <ShareTextMetadata
        {...content}
        target={{ kind: 'building', locale: routeLocale, id: building.id }}
      />
      <BuildingGallery key={id} building={building} modal />
    </>
  );
}
