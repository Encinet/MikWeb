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

export type BuildingImagePair<Value> = { webp: Value; jxl: Value };

declare const imageHashBrand: unique symbol;
type BuildingImageHash = string & { readonly [imageHashBrand]: true };

export type BuildingImageRef = BuildingImagePair<BuildingImageHash>;
export type BuildingImageUrl = `https://${string}` | `blob:${string}`;
export type BuildingImageUrls = BuildingImagePair<BuildingImageUrl>;

export interface BuildingInput<Text = LocalizedText, Image = BuildingImageRef> {
  name: Text;
  description: Text;
  coordinates: BuildingCoordinates;
  builders: Builder[];
  buildType: BuildingType;
  images: Image[];
  buildDate: string;
  tags?: Text[];
  source?: BuildingSource<Text>;
}

export interface Building<Text = LocalizedText, Image = BuildingImageRef>
  extends BuildingInput<Text, Image> {
  readonly id: string;
}

export type BuildingWithImageUrls<Text = LocalizedText> = Building<Text, BuildingImageUrls>;
export type LocalizedBuilding = BuildingWithImageUrls<string>;
