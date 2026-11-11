import { getLocale } from 'next-intl/server';
import { sortBuildings } from '@/modules/building/lib/building-catalog';
import { getBuildingCatalogSnapshot } from '@/modules/building/server/building-queries';
import { HomeBuildingUpdates } from '@/modules/home/ui/home-building-updates';

/** Only the two visible cards cross the server/client boundary. */
export async function HomeBuildingUpdatesSection() {
  const [locale, snapshot] = await Promise.all([getLocale(), getBuildingCatalogSnapshot()]);
  return (
    <HomeBuildingUpdates
      buildings={sortBuildings(snapshot.buildings, 'date-desc', locale).slice(0, 2)}
      unavailable={snapshot.error !== null}
    />
  );
}
