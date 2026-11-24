import { isRecord } from '@/shared/lib/is-record';
import type { Building } from './building-types';
import { isBuilding } from './building-validation';

export interface BuildingCatalogResponse {
  imageBaseUrl: string | null;
  buildings: Building[];
}

interface BuildingDetailResponse {
  imageBaseUrl: string | null;
  building: Building;
}

function isImageBaseUrl(value: unknown): value is string | null {
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

function isBuildingWithImageBase(value: unknown, imageBaseUrl: string | null): value is Building {
  return isBuilding(value) && (value.images.length === 0 || imageBaseUrl !== null);
}

export function isBuildingCatalogResponse(value: unknown): value is BuildingCatalogResponse {
  if (!isRecord(value) || !isImageBaseUrl(value.imageBaseUrl) || !Array.isArray(value.buildings)) {
    return false;
  }
  const { imageBaseUrl } = value;
  return value.buildings.every((building) => isBuildingWithImageBase(building, imageBaseUrl));
}

export function isBuildingDetailResponse(value: unknown): value is BuildingDetailResponse {
  return (
    isRecord(value) &&
    isImageBaseUrl(value.imageBaseUrl) &&
    isBuildingWithImageBase(value.building, value.imageBaseUrl)
  );
}

export function resolveBuildingImages(building: Building, imageBaseUrl: string | null): Building {
  if (imageBaseUrl === null || building.images.length === 0) return building;
  const prefix = `${imageBaseUrl}/buildings/${building.id}/`;
  return { ...building, images: building.images.map((filename) => prefix + filename) };
}

export function resolveBuildingCatalog({ buildings, imageBaseUrl }: BuildingCatalogResponse) {
  return buildings.map((building) => resolveBuildingImages(building, imageBaseUrl));
}
