import type { BuildingFilterId, BuildingSortKey } from './building-catalog';
import { isBuildingSortKey } from './building-catalog';

export interface BuildingCatalogQuery {
  query: string;
  filter: BuildingFilterId;
  sort: BuildingSortKey;
}

export function readBuildingCatalogQuery(
  params: Pick<URLSearchParams, 'get'>,
): BuildingCatalogQuery {
  const filter = params.get('type');
  const sort = params.get('sort');
  return {
    query: params.get('q') ?? '',
    filter:
      filter === 'original' || filter === 'derivative' || filter === 'replica' ? filter : 'all',
    sort: sort && isBuildingSortKey(sort) ? sort : 'random',
  };
}

/** Keep unrelated parameters, and omit defaults from shareable catalog URLs. */
export function writeBuildingCatalogQuery(params: URLSearchParams, query: BuildingCatalogQuery) {
  const next = new URLSearchParams(params);
  for (const [key, value, fallback] of [
    ['q', query.query, ''],
    ['type', query.filter, 'all'],
    ['sort', query.sort, 'random'],
  ]) {
    if (value === fallback) next.delete(key);
    else next.set(key, value);
  }
  return next;
}
