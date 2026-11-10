import type { ReactNode } from 'react';
import { BuildingsProvider } from '@/modules/building/model/buildings-provider';
import { getBuildingCatalogSnapshot } from '@/modules/building/server/building-queries';

/** Fetch only where the catalog is rendered; unrelated routes never wait for this service. */
export async function BuildingCatalogBoundary({ children }: { children: ReactNode }) {
  return (
    <BuildingsProvider initialSnapshot={await getBuildingCatalogSnapshot()}>
      {children}
    </BuildingsProvider>
  );
}
