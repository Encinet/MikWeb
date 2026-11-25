import type {
  Builder,
  Building,
  BuildingCoordinates,
  BuildingImageRef,
  BuildingSource,
} from '@/modules/building/model/building-types';
import { BUILDING_TYPES, MAX_JXL_PREVIEW_BYTES } from '@/modules/building/model/building-types';
import { isPlayerIdentity } from '@/modules/player/model/player-validation';
import { isLocalizedText, type LocalizedText } from '@/shared/i18n/localized-text';
import { isRecord } from '@/shared/lib/is-record';

const BUILDING_ID_PATTERN = /^[0-9a-f]{32}$/;
const BUILDING_FIELDS = new Set<string>([
  'id',
  'name',
  'description',
  'coordinates',
  'builders',
  'buildType',
  'images',
  'buildDate',
  'tags',
  'source',
] satisfies (keyof Building)[]);
const IMAGE_HASH_PATTERN = /^[0-9a-f]{64}$/;
const BUILDING_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const MAX_BUILDING_WORLD_NAME_LENGTH = 128;

export function isBuildingImageRef(value: unknown): value is BuildingImageRef {
  return (
    isRecord(value) &&
    Object.keys(value).length === 4 &&
    typeof value.thumbnailWebp === 'string' && IMAGE_HASH_PATTERN.test(value.thumbnailWebp) &&
    typeof value.jxlPreviewBytes === 'number' && Number.isInteger(value.jxlPreviewBytes) &&
    value.jxlPreviewBytes >= 0 && value.jxlPreviewBytes <= MAX_JXL_PREVIEW_BYTES &&
    typeof value.webp === 'string' && IMAGE_HASH_PATTERN.test(value.webp) &&
    typeof value.jxl === 'string' && IMAGE_HASH_PATTERN.test(value.jxl)
  );
}

function isBuilder(value: unknown): value is Builder {
  return (
    isPlayerIdentity(value) && isRecord(value) &&
    typeof value.weight === 'number' && Number.isFinite(value.weight) && value.weight >= 0
  );
}

function isBuildingCoordinates(value: unknown): value is BuildingCoordinates {
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
    value.length <= MAX_BUILDING_WORLD_NAME_LENGTH &&
    [...value].every((character) => {
      const code = character.codePointAt(0) ?? 0;
      return code > 31 && (code < 127 || code > 159);
    })
  );
}

export function isBuildingDate(value: unknown): value is string {
  if (typeof value !== 'string' || !BUILDING_DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function isBuildingSource(value: unknown): value is BuildingSource {
  return isBuildingSourceWithNotes(
    value,
    (notes): notes is LocalizedText =>
      isLocalizedText(notes) && Object.values(notes).some((text) => text.trim()),
  );
}

function isBuildingSourceWithNotes<Text>(
  value: unknown,
  isNotes: (value: unknown) => value is Text,
): value is BuildingSource<Text> {
  if (!isRecord(value)) {
    return false;
  }

  const { originalAuthor, originalLink, notes } = value;
  return (
    (originalAuthor !== undefined || originalLink !== undefined || notes !== undefined) &&
    (originalAuthor === undefined || (typeof originalAuthor === 'string' && !!originalAuthor.trim())) &&
    (originalLink === undefined ||
      (typeof originalLink === 'string' && isHttpLink(originalLink))) &&
    (notes === undefined || isNotes(notes))
  );
}

function isHttpLink(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

export function isBuilding(value: unknown): value is Building {
  return isBuildingWithText(value, isLocalizedText, isBuildingSource);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isLocalizedBuildingRecord(value: unknown): value is Building<string> {
  return isBuildingWithText(value, isString, (source): source is BuildingSource<string> =>
    isBuildingSourceWithNotes(source, isString),
  );
}

function isBuildingWithText<Text>(
  value: unknown,
  isText: (value: unknown) => value is Text,
  isSource: (value: unknown) => value is BuildingSource<Text>,
): value is Building<Text> {
  return (
    isRecord(value) &&
    isBuildingId(value.id) &&
    Object.keys(value).every((field) => BUILDING_FIELDS.has(field)) &&
    isText(value.name) &&
    isText(value.description) &&
    isBuildingCoordinates(value.coordinates) &&
    Array.isArray(value.builders) &&
    value.builders.length > 0 &&
    value.builders.every(isBuilder) &&
    BUILDING_TYPES.some((type) => type === value.buildType) &&
    Array.isArray(value.images) &&
    value.images.every(isBuildingImageRef) &&
    isBuildingDate(value.buildDate) &&
    (value.tags === undefined ||
      (Array.isArray(value.tags) && value.tags.every(isText))) &&
    (value.source === undefined || isSource(value.source))
  );
}

export function isBuildingId(value: unknown): value is string {
  return typeof value === 'string' && BUILDING_ID_PATTERN.test(value);
}
