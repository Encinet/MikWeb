import { dataApiUrl } from '@/shared/api/data-api-url';
import { getLocalizedText, type LocalizedText } from '@/shared/i18n/localized-text';
import type { AppLocale } from '@/shared/i18n/routing';
import { isRecord } from '@/shared/lib/is-record';
import type { Building, BuildingWithImageUrls, LocalizedBuilding } from './building-types';
import { isBuilding, isLocalizedBuildingRecord } from './building-validation';

export interface BuildingCatalogResponse<Text = LocalizedText> {
  imageBaseUrl: BuildingImageBaseUrl | null;
  buildings: Building<Text>[];
}

interface BuildingDetailResponse {
  imageBaseUrl: BuildingImageBaseUrl | null;
  building: Building;
}

type BuildingImageBaseUrl = `https://${string}`;

function isImageBaseUrl(value: unknown): value is BuildingImageBaseUrl | null {
  if (value === null) return true;
  if (
    typeof value !== 'string' ||
    !value.startsWith('https://') ||
    value.endsWith('/') ||
    /[?#\\\s]/.test(value)
  ) {
    return false;
  }
  try {
    const url = new URL(value);
    return !url.username && !url.password;
  } catch {
    return false;
  }
}

export function getPublicBuildingCatalogUrl({
  locale,
  limit,
}: { locale?: AppLocale; limit?: number } = {}) {
  const params = new URLSearchParams();
  if (locale !== undefined) params.set('locale', locale);
  if (limit !== undefined) params.set('limit', String(limit));
  return dataApiUrl(params.size ? `/buildings?${params}` : '/buildings');
}

export function isBuildingCatalogResponse(
  value: unknown,
  limit?: number,
): value is BuildingCatalogResponse {
  return isCatalogResponse(value, isBuilding, limit);
}

export function isLocalizedBuildingCatalogResponse(
  value: unknown,
  limit?: number,
): value is BuildingCatalogResponse<string> {
  return isCatalogResponse(value, isLocalizedBuildingRecord, limit);
}

function isCatalogResponse<Text>(
  value: unknown,
  isCatalogBuilding: (value: unknown) => value is Building<Text>,
  limit?: number,
): value is BuildingCatalogResponse<Text> {
  if (!isRecord(value) || !isImageBaseUrl(value.imageBaseUrl) || !Array.isArray(value.buildings)) {
    return false;
  }
  const { buildings, imageBaseUrl } = value;
  if (limit !== undefined && buildings.length > limit) return false;
  return buildings.every(
    (building) => isCatalogBuilding(building) && (building.images.length === 0 || imageBaseUrl !== null),
  );
}

export function isBuildingDetailResponse(value: unknown): value is BuildingDetailResponse {
  return (
    isRecord(value) &&
    isImageBaseUrl(value.imageBaseUrl) &&
    isBuilding(value.building) &&
    (value.building.images.length === 0 || value.imageBaseUrl !== null)
  );
}

export function localizeBuilding(
  { name, description, tags, source, ...building }: BuildingWithImageUrls,
  locale: AppLocale,
): LocalizedBuilding {
  return {
    ...building,
    name: getLocalizedText(name, locale),
    description: getLocalizedText(description, locale),
    tags: tags?.map((tag) => getLocalizedText(tag, locale)),
    source: source && {
      originalAuthor: source.originalAuthor,
      originalLink: source.originalLink,
      notes: source.notes === undefined ? undefined : getLocalizedText(source.notes, locale),
    },
  };
}

export function resolveBuildingImages<Text>(
  building: Building<Text>,
  imageBaseUrl: BuildingImageBaseUrl | null,
): BuildingWithImageUrls<Text> {
  if (imageBaseUrl === null) {
    if (building.images.length) throw new Error('Missing building image base URL');
    return { ...building, images: [] };
  }
  const prefix = `${imageBaseUrl}/buildings/${building.id}/` as const;
  return {
    ...building,
    images: building.images.map(({ webp, jxl }) => ({
      webp: `${prefix}${webp}.webp`,
      jxl: `${prefix}${jxl}.jxl`,
    })),
  };
}

export function resolveBuildingCatalog<Text>({
  buildings,
  imageBaseUrl,
}: BuildingCatalogResponse<Text>): BuildingWithImageUrls<Text>[] {
  return buildings.map((building) => resolveBuildingImages(building, imageBaseUrl));
}
