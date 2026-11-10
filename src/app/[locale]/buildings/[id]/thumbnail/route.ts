import { requireRouteLocale } from '@/shared/i18n/route-locale';
import {
  getBuildingShareThumbnail,
  socialImageResponse,
} from '@/site/seo/social-image/cached-social-images';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string; id: string }> },
) {
  const { locale, id } = await params;
  requireRouteLocale(locale);
  return socialImageResponse(await getBuildingShareThumbnail(id));
}
