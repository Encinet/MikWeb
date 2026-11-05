import { requireRouteLocale } from '@/shared/i18n/route-locale';
import { routing } from '@/shared/i18n/routing';
import { buildAppManifest } from '@/site/seo/build-app-manifest';

export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = requireRouteLocale(rawLocale);

  return Response.json(await buildAppManifest(locale), {
    headers: { 'Content-Type': 'application/manifest+json; charset=utf-8' },
  });
}
