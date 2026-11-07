import 'server-only';

import { notFound } from 'next/navigation';
import { cache } from 'react';
import { isBuilding, isBuildingArray, isBuildingId } from '@/modules/building/model/building-types';
import { dataApiUrl } from '@/shared/api/data-api-url';

const REVALIDATE_SECONDS = 300;

async function readBuildingResponse(path: string, revalidate: number) {
  return fetch(dataApiUrl(path), {
    next: { revalidate },
    signal: AbortSignal.timeout(15_000),
  });
}

export const getBuilding = cache(async (id: string, revalidate = REVALIDATE_SECONDS) => {
  if (!isBuildingId(id)) notFound();
  const response = await readBuildingResponse(`/buildings/${id.toLowerCase()}`, revalidate);
  if (response.status === 404) notFound();
  if (!response.ok) throw new Error('Building data unavailable');
  const data: unknown = await response.json();
  if (!isBuilding(data) || data.id !== id.toLowerCase()) {
    throw new Error('Invalid building data');
  }
  return data;
});

export const getBuildingCatalog = cache(async (revalidate = REVALIDATE_SECONDS) => {
  const response = await readBuildingResponse('/buildings', revalidate);
  if (!response.ok) throw new Error('Building catalog unavailable');
  const data: unknown = await response.json();
  if (!isBuildingArray(data)) throw new Error('Invalid building catalog');
  return data;
});
