import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ChatPage } from '@/modules/chat/ui/chat-page';
import { requireRouteLocale } from '@/shared/i18n/route-locale';
import { buildPageMetadata } from '@/site/seo/build-page-metadata';
import { ThemePreferences } from '@/site/theme/ui/theme-preferences';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = requireRouteLocale(rawLocale);
  const t = await getTranslations({ locale, namespace: 'chat' });
  return {
    ...buildPageMetadata({
      locale,
      title: t('title'),
      description: t('description'),
      pathname: '/chat',
    }),
    robots: { index: false, follow: false },
  };
}

export default function Page() {
  return <ChatPage appearance={<ThemePreferences />} />;
}
