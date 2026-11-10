import { requireRouteLocale } from '@/shared/i18n/route-locale';
import {
  getBuildingSocialImage,
  socialImageResponse,
} from '@/site/seo/social-image/cached-social-images';

// Cache the rendered PNG, not just its input data. New buildings work without a deployment.

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string; id: string }> },
) {
  const { locale: rawLocale, id } = await params;
  const locale = requireRouteLocale(rawLocale);
  return socialImageResponse(await getBuildingSocialImage(id, locale));
}
