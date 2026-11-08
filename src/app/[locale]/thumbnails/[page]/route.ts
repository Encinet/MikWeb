import { notFound } from 'next/navigation';
import { requireRouteLocale } from '@/shared/i18n/route-locale';
import { routing } from '@/shared/i18n/routing';
import { isSitePage, SITE_PAGE_IDS } from '@/site/seo/site-pages';
import { createSiteShareThumbnail } from '@/site/seo/social-image/share-thumbnail';

export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => SITE_PAGE_IDS.map((page) => ({ locale, page })));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string; page: string }> },
) {
  const { locale: rawLocale, page } = await params;
  const locale = requireRouteLocale(rawLocale);
  if (!isSitePage(page)) notFound();
  return createSiteShareThumbnail(locale, page);
}
