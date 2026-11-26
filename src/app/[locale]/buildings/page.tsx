import { localizeBuilding } from '@/modules/building/model/building-api';
import { BuildingsProvider } from '@/modules/building/model/buildings-provider';
import { readBuildingCatalog } from '@/modules/building/server/building-queries';
import BuildingsPage from '@/modules/building/ui/buildings-page';
import { requireRouteLocale } from '@/shared/i18n/route-locale';

export default async function Page({ params, searchParams }: PageProps<'/[locale]/buildings'>) {
  const [route, query, catalog] = await Promise.all([
    params,
    searchParams,
    readBuildingCatalog().catch(() => null),
  ]);
  const locale = requireRouteLocale(route.locale);
  const initialSearch = new URLSearchParams();
  for (const key of ['q', 'type', 'sort']) {
    const raw = query[key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (value !== undefined) initialSearch.set(key, value);
  }

  const initialCatalog = catalog && {
    imageBaseUrl: catalog.imageBaseUrl,
    buildings: catalog.buildings.map((building) => localizeBuilding(building, locale)),
  };
  return (
    <BuildingsProvider initialCatalog={initialCatalog}>
      <BuildingsPage initialSearch={initialSearch.toString()} />
    </BuildingsProvider>
  );
}
