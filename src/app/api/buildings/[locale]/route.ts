import { PHASE_PRODUCTION_BUILD } from 'next/constants';
import {
  getPublicBuildingCatalogUrl,
  localizeBuildingCatalog,
} from '@/modules/building/model/building-api';
import { readBuildingCatalog } from '@/modules/building/server/building-queries';
import { isRoutingLocale, routing } from '@/shared/i18n/routing';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isRoutingLocale(locale)) return new Response(null, { status: 404 });

  try {
    const catalog = await readBuildingCatalog();
    return Response.json(localizeBuildingCatalog(catalog, locale), {
      headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300, must-revalidate' },
    });
  } catch (error) {
    // A failed regeneration must retain the last usable catalog. If the initial
    // build has no snapshot, the public data service can recover independently.
    if (process.env.NEXT_PHASE !== PHASE_PRODUCTION_BUILD) throw error;
    return new Response(null, {
      status: 307,
      headers: { location: getPublicBuildingCatalogUrl({ locale }), 'Cache-Control': 'no-store' },
    });
  }
}
