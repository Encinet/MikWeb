import type { BuildingType, LocalizedBuilding } from '@/modules/building/model/building-types';
import type { AppLocale } from '@/shared/i18n/routing';

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

export function sortBuildings(
  buildings: LocalizedBuilding[],
  sortKey: BuildingSortKey,
  locale: AppLocale,
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

  if (sortKey === 'date-desc') return buildings.toSorted(newestFirst);
  if (sortKey === 'date-asc') return buildings.toSorted((left, right) => newestFirst(right, left));

  const names = new Intl.Collator(locale);
  const direction = sortKey === 'name-asc' ? 1 : -1;
  return buildings.toSorted(
    (left, right) => direction * names.compare(left.name.toLowerCase(), right.name.toLowerCase()),
  );
}
