import { requireRouteLocale } from '@/shared/i18n/route-locale';
import { routing } from '@/shared/i18n/routing';
import {
  getSiteSocialImage,
  socialImageResponse,
} from '@/site/seo/social-image/cached-social-images';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// The page metadata already points here. A route handler keeps image rendering out of page bundles.
export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = requireRouteLocale(rawLocale);
  return socialImageResponse(await getSiteSocialImage(locale));
}
