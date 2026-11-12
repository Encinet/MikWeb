import { sortBuildersByWeight } from '@/modules/building/lib/building-builders';
import type { Building } from '@/modules/building/model/building-types';
import { SITE_NAME, SITE_URL } from '@/shared/config/site-config';
import { getLocalizedText } from '@/shared/i18n/localized-text';

export function getBuildingPath(id: string) {
  return `/buildings/${id}`;
}

export function getBuildingUrl(id: string, locale: string) {
  return `${SITE_URL}/${locale}${getBuildingPath(id)}`;
}

export function getBuildingSocialImagePath(id: string, locale: string) {
  return `/${locale}${getBuildingPath(id)}/opengraph-image`;
}

export function getBuildingImagePath(id: string, imageIndex: number) {
  return `/api/buildings/${id}/images/${imageIndex}`;
}

export function getBuildingShareData(building: Building, locale: string): ShareData {
  const authors = sortBuildersByWeight(building.builders)
    .map((builder) => builder.name)
    .join(', ');
  const description = getLocalizedText(building.description, locale)
    .trim()
    .split(/\n\s*\n/)[0];
  return {
    title: `${getLocalizedText(building.name, locale)} · ${SITE_NAME}`,
    text: [authors, description?.replace(/\s+/g, ' ').slice(0, 160)].filter(Boolean).join(' · '),
    url: getBuildingUrl(building.id, locale),
  };
}
