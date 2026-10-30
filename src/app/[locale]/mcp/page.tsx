import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import McpPage from '@/modules/mcp/ui/mcp-page';
import { requireRouteLocale } from '@/shared/i18n/route-locale';
import { buildPageMetadata } from '@/site/seo/build-page-metadata';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = requireRouteLocale(rawLocale);
  const t = await getTranslations({ locale, namespace: 'mcpPage' });

  return buildPageMetadata({
    locale,
    title: t('title'),
    description: t('description'),
    pathname: '/mcp',
  });
}

export default McpPage;
