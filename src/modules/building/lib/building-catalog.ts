import type { Building, BuildingType } from '@/modules/building/model/building-types';
import { getLocalizedText } from '@/shared/i18n/localized-text';

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
  buildings: Building[],
  buildingFilter: BuildingFilterId,
  searchQuery: string,
  locale: string,
): Building[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  if (buildingFilter === 'all' && !normalizedQuery) return buildings;
  return buildings.filter((building) => {
    if (buildingFilter !== 'all' && building.buildType !== buildingFilter) return false;
    return (
      !normalizedQuery ||
      getLocalizedText(building.name, locale).toLowerCase().includes(normalizedQuery) ||
      getLocalizedText(building.description, locale).toLowerCase().includes(normalizedQuery) ||
      building.builders
        .map((builder) => builder.name.toLowerCase())
        .join(' ')
        .includes(normalizedQuery) ||
      (building.tags ?? [])
        .map((tag) => getLocalizedText(tag, locale).toLowerCase())
        .join(' ')
        .includes(normalizedQuery)
    );
  });
}

function newestFirst(left: Building, right: Building) {
  return right.buildDate.localeCompare(left.buildDate);
}

/** Choose the two homepage cards in catalog order when dates tie. */
export function getRecentBuildingUpdates(buildings: Building[]): Building[] {
  const recent: Building[] = [];
  for (const building of buildings) {
    const first = recent[0];
    const second = recent[1];
    if (!first || newestFirst(building, first) < 0) {
      if (first) recent[1] = first;
      recent[0] = building;
    } else if (!second || newestFirst(building, second) < 0) {
      recent[1] = building;
    }
  }
  return recent;
}

export function sortBuildings(
  buildings: Building[],
  sortKey: BuildingSortKey,
  locale: string,
): Building[] {
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
      case 'name-asc': {
        const leftName = getLocalizedText(leftBuilding.name, locale).toLowerCase();
        const rightName = getLocalizedText(rightBuilding.name, locale).toLowerCase();
        return leftName.localeCompare(rightName);
      }
      case 'name-desc': {
        const leftName = getLocalizedText(leftBuilding.name, locale).toLowerCase();
        const rightName = getLocalizedText(rightBuilding.name, locale).toLowerCase();
        return rightName.localeCompare(leftName);
      }
      default:
        return 0;
    }
  });
}
