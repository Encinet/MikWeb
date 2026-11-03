import { getMapWorlds } from '@/modules/map/server/map-worlds';

export async function GET() {
  try {
    return Response.json(
      { worlds: await getMapWorlds() },
      {
        headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' },
      },
    );
  } catch {
    return Response.json({ error: 'map_unavailable' }, { status: 503 });
  }
}
