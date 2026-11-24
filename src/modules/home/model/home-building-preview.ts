import type { LocalizedBuilding } from '@/modules/building/model/building-types';

export const HOME_BUILDING_LIMIT = 2;

export interface HomeBuildingPreview
  extends Pick<LocalizedBuilding, 'id' | 'name' | 'images' | 'coordinates'> {
  builderNames: string[];
}

export function toHomeBuildingPreview(building: LocalizedBuilding): HomeBuildingPreview {
  return {
    id: building.id,
    name: building.name,
    images: building.images,
    coordinates: building.coordinates,
    builderNames: building.builders.map((builder) => builder.name),
  };
}
