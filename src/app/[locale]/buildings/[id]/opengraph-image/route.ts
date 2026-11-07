import { getBuilding } from '@/modules/building/server/building-queries';
import { requireRouteLocale } from '@/shared/i18n/route-locale';
import { createBuildingSocialImage } from '@/site/seo/social-image/building-social-image';

// Cache the rendered PNG, not just its input data. New buildings work without a deployment.
export const dynamic = 'force-static';
export const revalidate = 86400;

export function generateStaticParams() {
  return [];
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string; id: string }> },
) {
  const { locale: rawLocale, id } = await params;
  const locale = requireRouteLocale(rawLocale);
  return createBuildingSocialImage(await getBuilding(id, revalidate), locale);
}
