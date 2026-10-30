import { getTranslations } from 'next-intl/server';
import { McpConnectionDetails } from '@/modules/mcp/ui/mcp-connection-details';
import { SITE_URL } from '@/shared/config/site-config';
import { requireRouteLocale } from '@/shared/i18n/route-locale';
import { ArtGuidePage } from '@/shared/ui/page/art-guide-page';

const MCP_API_ROUTE = '/api/mcp';

interface McpPageParams {
  params: Promise<{ locale: string }>;
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
      title: t('steps.client.title'),
      description: t('steps.client.description'),
    },
    {
      title: t('steps.connect.title'),
      description: t('steps.connect.description'),
    },
    {
      title: t('steps.done.title'),
      description: t('steps.done.description'),
    },
  ];

  return (
    <ArtGuidePage
      guideTitle={t('stepsTitle')}
      pageClassName="mcp-config-page"
      steps={setupSteps}
      subtitle={t('subtitle')}
      title={t('title')}
    >
      <McpConnectionDetails
        endpoint={mcpUrl}
        configJson={configJson}
        addressLabel={t('addressLabel')}
        configLabel={t('configTitle')}
        copyAddressLabel={t('copyAddress')}
        copyConfigLabel={t('copyConfig')}
      />
    </ArtGuidePage>
  );
}
