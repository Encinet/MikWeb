import { getBuilding } from '@/modules/building/server/building-queries';
import { requireRouteLocale } from '@/shared/i18n/route-locale';
import { createBuildingShareThumbnail } from '@/site/seo/social-image/share-thumbnail';

export const dynamic = 'force-static';
export const revalidate = 86400;

export function generateStaticParams() {
  return [];
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string; id: string }> },
) {
  const { locale, id } = await params;
  requireRouteLocale(locale);
  return createBuildingShareThumbnail(await getBuilding(id, revalidate));
}
