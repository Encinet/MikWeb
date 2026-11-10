import { BuildingCatalogBoundary } from '@/modules/building/ui/building-catalog-boundary';
import BuildingsPage from '@/modules/building/ui/buildings-page';

export default function Page() {
  return (
    <BuildingCatalogBoundary>
      <BuildingsPage />
    </BuildingCatalogBoundary>
  );
}
