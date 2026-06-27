import { buildPcl2HomepageXml } from '@/modules/pcl2/lib/pcl2-homepage-xml';
import { loadPcl2HomepageData } from '@/modules/pcl2/server/pcl2-homepage-data';
import { isRoutingLocale } from '@/shared/i18n/routing';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ locale: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const { locale: rawLocale } = await context.params;

  if (!isRoutingLocale(rawLocale)) {
    return new Response('Not Found', { status: 404 });
  }

  const data = await loadPcl2HomepageData(request, rawLocale);

  return new Response(buildPcl2HomepageXml(data), {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}
