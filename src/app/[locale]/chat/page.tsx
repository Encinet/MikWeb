import type { Metadata } from 'next';
import { ChatPage } from '@/modules/chat/ui/chat-page';
import { requireRouteLocale } from '@/shared/i18n/route-locale';
import { generateSitePageMetadata } from '@/site/seo/site-page-metadata';
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

export default function Page() {
  return <ChatPage appearance={<ThemePreferences />} />;
}
