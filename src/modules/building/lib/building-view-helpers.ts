import type { Building } from '@/modules/building/model/building-types';
import { getLocalizedText } from '@/modules/building/model/building-types';

export function getBuildingName(building: Building, locale: string): string {
  return getLocalizedText(building.name, locale);
}

export function getBuildingDescription(building: Building, locale: string): string {
  return getLocalizedText(building.description, locale);
}

export function getBuildingSourceNotes(building: Building, locale: string): string {
  return getLocalizedText(building.source?.notes, locale);
}

export function passthroughImageLoader({ src }: { src: string }): string {
  return src;
}
