import { Suspense } from 'react';
import { getBuilding } from '@/modules/building/server/building-queries';
import { BuildingGallery } from '@/modules/building/ui/building-gallery';
import { BuildingGalleryLoading } from '@/modules/building/ui/building-route-state';
import { BuildingsLoading } from '@/modules/building/ui/buildings-loading';
import { requireRouteLocale } from '@/shared/i18n/route-locale';
import { getBuildingMetadataContent } from '@/site/seo/build-building-metadata';
import { formatPageTitle } from '@/site/seo/page-title';
import { ShareTextMetadata } from '@/site/seo/share-text-metadata';

interface BuildingDetailProps {
  params: Promise<{ locale: string; id: string }>;
  modal?: boolean;
}

export function BuildingDetailPage(props: BuildingDetailProps) {
  return (
    <Suspense fallback={props.modal ? <BuildingGalleryLoading /> : <BuildingsLoading />}>
      <BuildingDetail {...props} />
    </Suspense>
  );
}

async function BuildingDetail({ params, modal = false }: BuildingDetailProps) {
  const { locale, id } = await params;
  const routeLocale = requireRouteLocale(locale);
  const building = await getBuilding(id);
  const { title, description } = getBuildingMetadataContent(building, routeLocale);
  return (
    <>
      <ShareTextMetadata
        title={formatPageTitle(title)}
        description={description}
        target={{ kind: 'building', locale: routeLocale, id: building.id }}
      />
      <BuildingGallery key={id} building={building} modal={modal} />
    </>
  );
}
