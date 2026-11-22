import { wikiSearchIndexResponse } from '@/modules/wiki/server/public-wiki-request';
import { routing } from '@/shared/i18n/routing';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return wikiSearchIndexResponse(locale, 'compact');
}
