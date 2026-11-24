import type { BuildingType, LocalizedBuilding } from '@/modules/building/model/building-types';

export type BuildingFilterId = 'all' | BuildingType;
export type BuildingSortKey = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc' | 'random';

export const BUILDINGS_PAGE_SIZE = 12;

export const BUILDING_SORT_KEYS = [
  'date-desc',
  'date-asc',
  'name-asc',
  'name-desc',
  'random',
] as const satisfies readonly BuildingSortKey[];

export function isBuildingSortKey(value: string): value is BuildingSortKey {
  return BUILDING_SORT_KEYS.some((sortKey) => sortKey === value);
}

export function filterBuildings(
  buildings: LocalizedBuilding[],
  buildingFilter: BuildingFilterId,
  searchQuery: string,
): LocalizedBuilding[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  if (buildingFilter === 'all' && !normalizedQuery) return buildings;
  return buildings.filter((building) => {
    if (buildingFilter !== 'all' && building.buildType !== buildingFilter) return false;
    return (
      !normalizedQuery ||
      building.name.toLowerCase().includes(normalizedQuery) ||
      building.description.toLowerCase().includes(normalizedQuery) ||
      building.builders
        .map((builder) => builder.name.toLowerCase())
        .join(' ')
        .includes(normalizedQuery) ||
      (building.tags ?? [])
        .map((tag) => tag.toLowerCase())
        .join(' ')
        .includes(normalizedQuery)
    );
  });
}

function newestFirst(left: LocalizedBuilding, right: LocalizedBuilding) {
  return right.buildDate.localeCompare(left.buildDate);
}

function nameAscending(left: LocalizedBuilding, right: LocalizedBuilding) {
  return left.name.toLowerCase().localeCompare(right.name.toLowerCase());
}

export function sortBuildings(
  buildings: LocalizedBuilding[],
  sortKey: BuildingSortKey,
): LocalizedBuilding[] {
  if (sortKey === 'random') {
    const seededRandom = (seed: number) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };
    let seed = 12345;
    const shuffledBuildings = [...buildings];

    for (let index = shuffledBuildings.length - 1; index > 0; index -= 1) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const targetIndex = Math.floor(seededRandom(seed) * (index + 1));
      [shuffledBuildings[index], shuffledBuildings[targetIndex]] = [
        shuffledBuildings[targetIndex],
        shuffledBuildings[index],
      ];
    }

    return shuffledBuildings;
  }

  return [...buildings].sort((leftBuilding, rightBuilding) => {
    switch (sortKey) {
      case 'date-desc':
        return newestFirst(leftBuilding, rightBuilding);
      case 'date-asc':
        return newestFirst(rightBuilding, leftBuilding);
      case 'name-asc':
        return nameAscending(leftBuilding, rightBuilding);
      case 'name-desc':
        return nameAscending(rightBuilding, leftBuilding);
    }
  });
}
