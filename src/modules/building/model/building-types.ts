import type { Player } from '@/modules/player/model/player-types';
import { isPlayer } from '@/modules/player/model/player-types';

export type BuildType = 'original' | 'derivative' | 'replica';

export interface Builder extends Player {
  weight: number;
}

export interface Coordinates {
  x: number;
  y: number;
  z: number;
}

export interface LocalizedText {
  [locale: string]: string;
}

export interface BuildingSource {
  originalAuthor?: string;
  originalLink?: string;
  notes?: LocalizedText;
}

export interface Building {
  name: LocalizedText;
  description: LocalizedText;
  coordinates: Coordinates;
  builders: Builder[];
  buildType: BuildType;
  images: string[];
  buildDate: string;
  tags?: LocalizedText[];
  source?: BuildingSource | null;
}

export type BuildingsApiResponse = Building[];

export interface BuildingsContextValue {
  buildings: Building[];
  buildingCount: number;
  isLoading: boolean;
  error: string | null;
  fetchBuildings: () => Promise<void>;
  lastUpdatedAt: number | null;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

export function isLocalizedText(value: unknown): value is LocalizedText {
  return isObjectRecord(value) && Object.values(value).every((item) => typeof item === 'string');
}

export function isBuilder(value: unknown): value is Builder {
  return isPlayer(value) && isObjectRecord(value) && typeof value.weight === 'number';
}

export function isCoordinates(value: unknown): value is Coordinates {
  return (
    isObjectRecord(value) &&
    typeof value.x === 'number' &&
    typeof value.y === 'number' &&
    typeof value.z === 'number'
  );
}

export function isBuildingSource(value: unknown): value is BuildingSource {
  if (value === undefined || value === null) {
    return true;
  }

  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    (value.originalAuthor === undefined || typeof value.originalAuthor === 'string') &&
    (value.originalLink === undefined || typeof value.originalLink === 'string') &&
    (value.notes === undefined || isLocalizedText(value.notes))
  );
}

export function isBuilding(value: unknown): value is Building {
  return (
    isObjectRecord(value) &&
    isLocalizedText(value.name) &&
    isLocalizedText(value.description) &&
    isCoordinates(value.coordinates) &&
    Array.isArray(value.builders) &&
    value.builders.every(isBuilder) &&
    (value.buildType === 'original' ||
      value.buildType === 'derivative' ||
      value.buildType === 'replica') &&
    isStringArray(value.images) &&
    typeof value.buildDate === 'string' &&
    (value.tags === undefined ||
      (Array.isArray(value.tags) && value.tags.every(isLocalizedText))) &&
    isBuildingSource(value.source)
  );
}

export function isBuildingArray(value: unknown): value is Building[] {
  return Array.isArray(value) && value.every(isBuilding);
}

export function getLocalizedText(
  content: LocalizedText | undefined,
  locale: string,
  fallbackLocales: string[] = ['en', 'zh-CN'],
): string {
  if (!content) {
    return '';
  }

  const localeCandidates = [locale, ...fallbackLocales];

  for (const localeCandidate of localeCandidates) {
    const localizedValue = content[localeCandidate];

    if (localizedValue) {
      return localizedValue;
    }
  }

  return Object.values(content)[0] ?? '';
}

export function sortBuildersByWeight(builders: Builder[]): Builder[] {
  return [...builders].sort(
    (leftBuilder, rightBuilder) => rightBuilder.weight - leftBuilder.weight,
  );
}
