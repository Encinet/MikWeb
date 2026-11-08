import type { Metadata } from 'next';
import { getBuildingPath, getBuildingSocialImagePath } from '@/modules/building/lib/building-links';
import {
  getBuildingDescription,
  getBuildingName,
} from '@/modules/building/lib/building-view-helpers';
import type { Building } from '@/modules/building/model/building-types';
import { getBuilding } from '@/modules/building/server/building-queries';
import { requireRouteLocale } from '@/shared/i18n/route-locale';
import type { AppLocale } from '@/shared/i18n/routing';
import { buildPageMetadata } from '@/site/seo/build-page-metadata';

export async function generateBuildingMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, id } = await params;
  const locale = requireRouteLocale(rawLocale);
  const building = await getBuilding(id);
  const { title, description } = getBuildingMetadataContent(building, locale);
  const pathname = getBuildingPath(building.id);
  return buildPageMetadata({
    locale,
    title,
    description,
    pathname,
    imagePath: getBuildingSocialImagePath(building.id, locale),
  });
}

export function getBuildingMetadataContent(building: Building, locale: AppLocale) {
  const title = getBuildingName(building, locale);
  const description = getBuildingDescription(building, locale)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
  return { title, description };
}
