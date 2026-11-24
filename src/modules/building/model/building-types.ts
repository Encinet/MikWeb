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

export interface BuildingSource<Text = LocalizedText> {
  originalAuthor?: string;
  originalLink?: string;
  notes?: Text;
}

export interface BuildingInput<Text = LocalizedText> {
  name: Text;
  description: Text;
  coordinates: BuildingCoordinates;
  builders: Builder[];
  buildType: BuildingType;
  images: string[];
  buildDate: string;
  tags?: Text[];
  source?: BuildingSource<Text>;
}

export interface Building<Text = LocalizedText> extends BuildingInput<Text> {
  readonly id: string;
}

export type LocalizedBuilding = Building<string>;
