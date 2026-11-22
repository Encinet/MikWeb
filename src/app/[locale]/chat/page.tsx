import '../../styles/modules/chat.css';
import '../../styles/modules/chat-tools.css';
import '../../styles/modules/chat-settings.css';
import '../../styles/modules/chat-motion.css';

import type { Metadata } from 'next';
import { ChatPage } from '@/modules/chat/ui/chat-page';
import { ClientMessages } from '@/shared/i18n/client-messages';
import { requireRouteLocale } from '@/shared/i18n/route-locale';
import { generateSitePageMetadata } from '@/site/seo/site-page-metadata';
import { SiteShareMetadata } from '@/site/seo/site-share-metadata';
import { ThemePreferences } from '@/site/theme/ui/theme-preferences';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = requireRouteLocale(rawLocale);
  return generateSitePageMetadata(locale, 'chat');
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = requireRouteLocale(rawLocale);
  return (
    <>
      <SiteShareMetadata locale={locale} page="chat" />
      <ClientMessages locale={locale} namespaces={['chat']}>
        <ChatPage appearance={<ThemePreferences />} />
      </ClientMessages>
    </>
  );
}
