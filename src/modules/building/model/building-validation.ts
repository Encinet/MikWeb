import type {
  Builder,
  Building,
  BuildingCoordinates,
  BuildingInput,
  BuildingSource,
} from '@/modules/building/model/building-types';
import { BUILDING_TYPES } from '@/modules/building/model/building-types';
import { isPlayerIdentity } from '@/modules/player/model/player-validation';
import { isLocalizedText } from '@/shared/i18n/localized-text';
import { isRecord } from '@/shared/lib/is-record';

const BUILDING_ID_PATTERN = /^[0-9a-f]{32}$/i;

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

export function isBuilder(value: unknown): value is Builder {
  return isPlayerIdentity(value) && isRecord(value) && typeof value.weight === 'number';
}

export function isBuildingCoordinates(value: unknown): value is BuildingCoordinates {
  return (
    isRecord(value) &&
    isWorldName(value.world) &&
    typeof value.x === 'number' &&
    Number.isFinite(value.x) &&
    typeof value.y === 'number' &&
    Number.isFinite(value.y) &&
    typeof value.z === 'number' &&
    Number.isFinite(value.z)
  );
}

export function isWorldName(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.length <= 128 &&
    [...value].every((character) => {
      const code = character.codePointAt(0) ?? 0;
      return code > 31 && (code < 127 || code > 159);
    })
  );
}

export function isBuildingSource(value: unknown): value is BuildingSource {
  if (!isRecord(value)) {
    return false;
  }

  return (
    (value.originalAuthor === undefined || typeof value.originalAuthor === 'string') &&
    (value.originalLink === undefined || typeof value.originalLink === 'string') &&
    (value.notes === undefined || isLocalizedText(value.notes))
  );
}

export function isBuildingInput(value: unknown): value is BuildingInput {
  return (
    isRecord(value) &&
    isLocalizedText(value.name) &&
    isLocalizedText(value.description) &&
    isBuildingCoordinates(value.coordinates) &&
    Array.isArray(value.builders) &&
    value.builders.every(isBuilder) &&
    BUILDING_TYPES.some((type) => type === value.buildType) &&
    isStringArray(value.images) &&
    typeof value.buildDate === 'string' &&
    (value.tags === undefined ||
      (Array.isArray(value.tags) && value.tags.every(isLocalizedText))) &&
    (value.source === undefined || value.source === null || isBuildingSource(value.source))
  );
}

export function isBuilding(value: unknown): value is Building {
  return isRecord(value) && isBuildingId(value.id) && isBuildingInput(value);
}

export function isBuildingId(value: unknown): value is string {
  return typeof value === 'string' && BUILDING_ID_PATTERN.test(value);
}

export function isBuildingArray(value: unknown): value is Building[] {
  return Array.isArray(value) && value.every(isBuilding);
}
