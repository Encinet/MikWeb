import type { Metadata } from 'next';
import { ChatPage } from '@/modules/chat/ui/chat-page';
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
  return {
    ...(await generateSitePageMetadata(locale, 'chat')),
    robots: { index: false, follow: false },
  };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <>
      <SiteShareMetadata locale={requireRouteLocale(locale)} page="chat" />
      <ChatPage appearance={<ThemePreferences />} />
    </>
  );
}
