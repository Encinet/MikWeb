import 'server-only';

import { cacheLife } from 'next/cache';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import type { BuildingCatalogSnapshot } from '@/modules/building/model/building-types';
import {
  isBuilding,
  isBuildingArray,
  isBuildingId,
} from '@/modules/building/model/building-validation';
import { dataApiUrl } from '@/shared/api/data-api-url';

const REVALIDATE_SECONDS = 300;

async function readBuildingResponse(path: string) {
  return fetch(dataApiUrl(path), {
    signal: AbortSignal.timeout(15_000),
  });
}

export async function getBuilding(id: string, revalidate = REVALIDATE_SECONDS) {
  'use cache';
  cacheLife({ stale: 300, revalidate, expire: Math.max(3600, revalidate * 7) });
  if (!isBuildingId(id)) notFound();
  const response = await readBuildingResponse(`/buildings/${id.toLowerCase()}`);
  if (response.status === 404) notFound();
  if (!response.ok) throw new Error('Building data unavailable');
  const data: unknown = await response.json();
  if (!isBuilding(data) || data.id !== id.toLowerCase()) {
    throw new Error('Invalid building data');
  }
  return data;
}

export async function getBuildingCatalog(revalidate = REVALIDATE_SECONDS) {
  return (await readBuildingCatalogSnapshot(revalidate)).buildings;
}

async function readBuildingCatalogSnapshot(revalidate: number): Promise<BuildingCatalogSnapshot> {
  'use cache';
  cacheLife({ stale: 300, revalidate, expire: Math.max(3600, revalidate * 7) });
  const response = await readBuildingResponse('/buildings');
  if (!response.ok) throw new Error('Building catalog unavailable');
  const data: unknown = await response.json();
  if (!isBuildingArray(data)) throw new Error('Invalid building catalog');
  return { buildings: data, error: null, updatedAt: Date.now() };
}

export const getBuildingCatalogSnapshot = cache(async (): Promise<BuildingCatalogSnapshot> => {
  try {
    return await readBuildingCatalogSnapshot(REVALIDATE_SECONDS);
  } catch {
    // Keep the page and its retry action available when the data service is temporarily down.
    return { buildings: [], error: 'building_catalog_unavailable', updatedAt: null };
  }
});
