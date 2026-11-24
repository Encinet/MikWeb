import { getLocale } from 'next-intl/server';
import { localizeBuilding, resolveBuildingCatalog } from '@/modules/building/model/building-api';
import { readBuildingCatalog } from '@/modules/building/server/building-queries';
import {
  HOME_BUILDING_LIMIT,
  toHomeBuildingPreview,
} from '@/modules/home/model/home-building-preview';
import {
  HomeBuildingUpdates,
  HomeBuildingUpdatesRecovery,
} from '@/modules/home/ui/home-building-updates';

/** Only the two visible cards cross the server/client boundary. */
export async function HomeBuildingUpdatesSection() {
  const [catalog, locale] = await Promise.all([
    readBuildingCatalog({ limit: HOME_BUILDING_LIMIT }).catch(() => null),
    getLocale(),
  ]);
  if (!catalog) {
    return <HomeBuildingUpdatesRecovery key={locale} locale={locale} />;
  }
  const buildings = resolveBuildingCatalog(catalog).map((building) =>
    toHomeBuildingPreview(localizeBuilding(building, locale)),
  );
  return <HomeBuildingUpdates buildings={buildings} />;
}
