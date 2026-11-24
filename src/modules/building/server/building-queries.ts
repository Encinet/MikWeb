import 'server-only';

import { cacheLife } from 'next/cache';
import { notFound } from 'next/navigation';
import {
  getPublicBuildingCatalogUrl,
  isBuildingCatalogResponse,
  isBuildingDetailResponse,
  localizeBuilding,
  resolveBuildingImages,
} from '@/modules/building/model/building-api';
import { isBuildingId } from '@/modules/building/model/building-validation';
import { dataApiUrl } from '@/shared/api/data-api-url';
import type { AppLocale } from '@/shared/i18n/routing';

const REVALIDATE_SECONDS = 300;

async function readBuildingResponse(url: string) {
  return fetch(url, {
    signal: AbortSignal.timeout(15_000),
  });
}

export async function getBuilding(id: string, revalidate = REVALIDATE_SECONDS) {
  'use cache';
  cacheLife({ stale: 300, revalidate, expire: Math.max(3600, revalidate * 7) });
  if (!isBuildingId(id)) notFound();
  const response = await readBuildingResponse(dataApiUrl(`/buildings/${id}`));
  if (response.status === 404) notFound();
  if (!response.ok) throw new Error('Building data unavailable');
  const data: unknown = await response.json();
  if (!isBuildingDetailResponse(data) || data.building.id !== id) {
    throw new Error('Invalid building data');
  }
  return resolveBuildingImages(data.building, data.imageBaseUrl);
}

export async function getLocalizedBuilding(id: string, locale: AppLocale, revalidate?: number) {
  return localizeBuilding(await getBuilding(id, revalidate), locale);
}

export async function readBuildingCatalog({
  limit,
  revalidate = REVALIDATE_SECONDS,
}: { limit?: number; revalidate?: number } = {}) {
  'use cache';
  cacheLife({ stale: 300, revalidate, expire: Math.max(3600, revalidate * 7) });
  const response = await readBuildingResponse(getPublicBuildingCatalogUrl({ limit }));
  if (!response.ok) throw new Error('Building catalog unavailable');
  const data: unknown = await response.json();
  if (!isBuildingCatalogResponse(data, limit)) throw new Error('Invalid building catalog');
  return data;
}
