import type { PlayerIdentity } from '@/modules/player/model/player-types';
import type { LocalizedText } from '@/shared/i18n/localized-text';

export const BUILDING_TYPES = ['original', 'derivative', 'replica'] as const;
export type BuildingType = (typeof BUILDING_TYPES)[number];

export interface Builder extends PlayerIdentity {
  weight: number;
}

export interface BuildingCoordinates {
  world: string;
  x: number;
  y: number;
  z: number;
}

export interface BuildingSource {
  originalAuthor?: string;
  originalLink?: string;
  notes?: LocalizedText;
}

export interface BuildingInput {
  name: LocalizedText;
  description: LocalizedText;
  coordinates: BuildingCoordinates;
  builders: Builder[];
  buildType: BuildingType;
  images: string[];
  buildDate: string;
  tags?: LocalizedText[];
  source?: BuildingSource | null;
}

export interface Building extends BuildingInput {
  readonly id: string;
}

export interface BuildingCatalogSnapshot {
  buildings: Building[];
  error: string | null;
  updatedAt: number | null;
}
