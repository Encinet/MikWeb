import type { Metadata } from 'next';
import { getBuildingPath, getBuildingSocialImagePath } from '@/modules/building/lib/building-links';
import type { LocalizedBuilding } from '@/modules/building/model/building-types';
import { getLocalizedBuilding } from '@/modules/building/server/building-queries';
import { requireRouteLocale } from '@/shared/i18n/route-locale';
import { buildPageMetadata } from '@/site/seo/build-page-metadata';

export async function generateBuildingMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, id } = await params;
  const locale = requireRouteLocale(rawLocale);
  const building = await getLocalizedBuilding(id, locale);
  const { title, description } = getBuildingMetadataContent(building);
  const pathname = getBuildingPath(building.id);
  return buildPageMetadata({
    locale,
    title,
    description,
    pathname,
    imagePath: getBuildingSocialImagePath(building.id, locale),
  });
}

export function getBuildingMetadataContent(building: LocalizedBuilding) {
  const description = building.description.replace(/\s+/g, ' ').trim().slice(0, 200);
  return { title: building.name, description };
}
