import { getRecentBuildingUpdates } from '@/modules/building/lib/building-catalog';
import { BuildingsProvider } from '@/modules/building/model/buildings-provider';
import { getBuildingCatalogSnapshot } from '@/modules/building/server/building-queries';
import {
  HomeBuildingUpdates,
  HomeBuildingUpdatesRecovery,
} from '@/modules/home/ui/home-building-updates';

/** Only the two visible cards cross the server/client boundary. */
export async function HomeBuildingUpdatesSection() {
  const snapshot = await getBuildingCatalogSnapshot();
  if (snapshot.error) {
    return (
      <BuildingsProvider initialSnapshot={snapshot}>
        <HomeBuildingUpdatesRecovery />
      </BuildingsProvider>
    );
  }
  return <HomeBuildingUpdates buildings={getRecentBuildingUpdates(snapshot.buildings)} />;
}
