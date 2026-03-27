export interface ApiErrorPayload {
  error: string;
  message?: string;
}

export type WikiSectionId = 'getting-started' | 'rules' | 'commands' | 'community' | 'tips';

export type WikiLocale = 'zh-CN' | 'en';

export type WikiSectionIcon = 'Home' | 'Wrench' | 'Shield' | 'Users' | 'Zap';

export interface WikiSectionDefinition {
  id: WikiSectionId;
  icon: WikiSectionIcon;
  label: string;
}

export type WikiSectionContentMap = Record<WikiSectionId, string>;

export interface MarkdownBlock {
  heading: string;
  level: number;
  slug: string;
  directRaw: string;
  subtreeRaw: string;
}

export interface PreparedQuery {
  lower: string;
  tokens: string[];
}

export type FuzzyMatchScore = number;

export interface SearchableWikiBlock {
  path: string;
  url: string;
  content: string;
  heading: string;
  directText: string;
  subtreeText: string;
  searchableText: string;
  level: number;
}

export interface WikiSearchResult {
  path: string;
  url: string;
  content: string;
  score: number;
}

export interface Player {
  name: string;
  uuid: string;
}

export interface PlayerStatusPayload {
  players: Player[];
  count: number;
}

export type PlayersApiResponse = PlayerStatusPayload;

export interface AnnouncementItem {
  content: string;
  timestamp: string;
}

export type AnnouncementsApiResponse = AnnouncementItem[];

export interface BanItem {
  playerName: string;
  playerUuid: string;
  reason: string;
  bannedBy: string;
  bannedAt: string;
  expiresAt: string | null;
  isPermanent: boolean;
}

export type BansApiResponse = BanItem[];

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

export interface PlayerContextValue {
  players: Player[];
  playerCount: number;
  isOnline: boolean;
  isLoading: boolean;
  networkError: boolean;
}

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

export function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
  return isObjectRecord(value) && typeof value.error === 'string';
}

export function isPlayer(value: unknown): value is Player {
  return isObjectRecord(value) && typeof value.name === 'string' && typeof value.uuid === 'string';
}

export function isPlayerStatusPayload(value: unknown): value is PlayerStatusPayload {
  return (
    isObjectRecord(value) &&
    typeof value.count === 'number' &&
    Array.isArray(value.players) &&
    value.players.every(isPlayer)
  );
}

export function isAnnouncementItem(value: unknown): value is AnnouncementItem {
  return (
    isObjectRecord(value) &&
    typeof value.content === 'string' &&
    typeof value.timestamp === 'string'
  );
}

export function isAnnouncementItemArray(value: unknown): value is AnnouncementItem[] {
  return Array.isArray(value) && value.every(isAnnouncementItem);
}

export function isBanItem(value: unknown): value is BanItem {
  return (
    isObjectRecord(value) &&
    typeof value.playerName === 'string' &&
    typeof value.playerUuid === 'string' &&
    typeof value.reason === 'string' &&
    typeof value.bannedBy === 'string' &&
    typeof value.bannedAt === 'string' &&
    (typeof value.expiresAt === 'string' || value.expiresAt === null) &&
    typeof value.isPermanent === 'boolean'
  );
}

export function isBanItemArray(value: unknown): value is BanItem[] {
  return Array.isArray(value) && value.every(isBanItem);
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
