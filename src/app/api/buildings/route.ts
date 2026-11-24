import { PHASE_PRODUCTION_BUILD } from 'next/constants';
import { readBuildingCatalog } from '@/modules/building/server/building-queries';
import { dataApiUrl } from '@/shared/api/data-api-url';

export async function GET() {
  try {
    const { catalog } = await readBuildingCatalog();
    return Response.json(catalog, {
      headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300, must-revalidate' },
    });
  } catch (error) {
    // A failed regeneration must retain the last usable catalog. If the initial
    // build has no snapshot, the public data service can recover independently.
    if (process.env.NEXT_PHASE !== PHASE_PRODUCTION_BUILD) throw error;
    return new Response(null, {
      status: 307,
      headers: { location: dataApiUrl('/buildings'), 'Cache-Control': 'no-store' },
    });
  }
}
