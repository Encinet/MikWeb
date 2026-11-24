import { sortBuildersByWeight } from '@/modules/building/lib/building-builders';
import type { LocalizedBuilding } from '@/modules/building/model/building-types';
import { SITE_NAME, SITE_URL } from '@/shared/config/site-config';
import type { AppLocale } from '@/shared/i18n/routing';

export function getBuildingCatalogPath(locale: AppLocale) {
  return `/api/buildings/${locale}`;
}

export function getBuildingPath(id: string) {
  return `/buildings/${id}`;
}

export function getBuildingUrl(id: string, locale: string) {
  return `${SITE_URL}/${locale}${getBuildingPath(id)}`;
}

export function getBuildingSocialImagePath(id: string, locale: string) {
  return `/${locale}${getBuildingPath(id)}/opengraph-image`;
}

const previewWidths = { cover: 640, thumbnail: 160 } as const;

export function getBuildingPreviewUrl(original: string, variant: keyof typeof previewWidths) {
  return `${original}?w=${previewWidths[variant]}`;
}

export function getBuildingShareData(building: LocalizedBuilding, locale: string): ShareData {
  const authors = sortBuildersByWeight(building.builders)
    .map((builder) => builder.name)
    .join(', ');
  const description = building.description.trim().split(/\n\s*\n/)[0];
  return {
    title: `${building.name} · ${SITE_NAME}`,
    text: [authors, description?.replace(/\s+/g, ' ').slice(0, 160)].filter(Boolean).join(' · '),
    url: getBuildingUrl(building.id, locale),
  };
}
