import { CheckCircle2, Clipboard, PlugZap, Settings2 } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { requireRouteLocale } from '@/shared/i18n/route-locale';
import { CopyButton } from '@/shared/ui/action/copy-button';
import { ArtGuidePage } from '@/shared/ui/page/art-guide-page';
import { SITE_URL } from '@/site/config/site-config';
import { buildPageMetadata } from '@/site/seo/build-page-metadata';

const MCP_ROUTE = '/mcp';
const MCP_API_ROUTE = '/api/mcp';

interface McpPageParams {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: McpPageParams): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = requireRouteLocale(rawLocale);
  const t = await getTranslations({ locale, namespace: 'mcpPage' });

  return buildPageMetadata({
    locale,
    title: t('title'),
    description: t('description'),
    pathname: MCP_ROUTE,
  });
}

export default async function McpPage({ params }: McpPageParams) {
  const { locale: rawLocale } = await params;
  const locale = requireRouteLocale(rawLocale);
  const t = await getTranslations({ locale, namespace: 'mcpPage' });
  const mcpUrl = `${SITE_URL}${MCP_API_ROUTE}`;
  const configJson = JSON.stringify(
    {
      mcpServers: {
        mik: {
          url: mcpUrl,
        },
      },
    },
    null,
    2,
  );
  const setupSteps = [
    {
      icon: Clipboard,
      title: t('steps.copy.title'),
      description: t('steps.copy.description'),
    },
    {
      icon: Settings2,
      title: t('steps.client.title'),
      description: t('steps.client.description'),
    },
    {
      icon: PlugZap,
      title: t('steps.connect.title'),
      description: t('steps.connect.description'),
    },
    {
      icon: CheckCircle2,
      title: t('steps.done.title'),
      description: t('steps.done.description'),
    },
  ];

  return (
    <ArtGuidePage
      badge={t('badge')}
      guideTitle={t('stepsTitle')}
      pageClassName="mcp-config-page"
      panelClassName="mcp-config-panel"
      steps={setupSteps}
      subtitle={t('subtitle')}
      title={t('title')}
    >
      <div className="mcp-config-copy">
        <span>{t('configTitle')}</span>
        <div className="mcp-config-code mcp-config-code--hero">
          <pre>
            <code>{configJson}</code>
          </pre>
          <CopyButton className="mcp-config-code__copy" value={configJson} />
        </div>
      </div>
    </ArtGuidePage>
  );
}
