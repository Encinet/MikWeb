import type { Building, BuildType } from '@/lib/types';
import { getLocalizedText } from '@/lib/types';

export type BuildingFilterId = 'all' | BuildType;
export type BuildingSortKey = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc' | 'random';

export const BUILDINGS_PAGE_SIZE = 12;

export const BUILDING_SORT_KEYS = [
  'date-desc',
  'date-asc',
  'name-asc',
  'name-desc',
  'random',
] as const satisfies readonly BuildingSortKey[];

export const BUILDING_MASONRY_BREAKPOINT_COLUMNS = {
  default: 3,
  1536: 3,
  1280: 3,
  1024: 2,
  640: 1,
} as const;

export function isBuildingSortKey(value: string): value is BuildingSortKey {
  return BUILDING_SORT_KEYS.some((sortKey) => sortKey === value);
}

export function getBuildingId(building: Building): string {
  const hashSource = `${building.coordinates.x}-${building.coordinates.y}-${building.coordinates.z}-${building.buildDate}-${building.builders.map((builder) => builder.uuid).join('-')}`;
  let hash = 0;

  for (let index = 0; index < hashSource.length; index += 1) {
    const character = hashSource.charCodeAt(index);
    hash = (hash << 5) - hash + character;
    hash &= hash;
  }

  return Math.abs(hash).toString(36);
}

export function getBuildingImages(building: Building): string[] {
  return building.images;
}

export function filterBuildings(
  buildings: Building[],
  buildingFilter: BuildingFilterId,
  searchQuery: string,
  locale: string,
): Building[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  return buildings
    .filter((building) => {
      if (buildingFilter === 'all') {
        return true;
      }

      return building.buildType === buildingFilter;
    })
    .filter((building) => {
      if (!normalizedQuery) {
        return true;
      }

      const buildingName = getLocalizedText(building.name, locale).toLowerCase();
      const buildingDescription = getLocalizedText(building.description, locale).toLowerCase();
      const builderNames = building.builders.map((builder) => builder.name.toLowerCase()).join(' ');
      const tagValues = (building.tags ?? [])
        .map((tag) => getLocalizedText(tag, locale).toLowerCase())
        .join(' ');

      return (
        buildingName.includes(normalizedQuery) ||
        buildingDescription.includes(normalizedQuery) ||
        builderNames.includes(normalizedQuery) ||
        tagValues.includes(normalizedQuery)
      );
    });
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
        return (
          new Date(rightBuilding.buildDate).getTime() - new Date(leftBuilding.buildDate).getTime()
        );
      case 'date-asc':
        return (
          new Date(leftBuilding.buildDate).getTime() - new Date(rightBuilding.buildDate).getTime()
        );
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
