import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { BuildingsProvider } from '@/modules/building/model/buildings-provider';
import { PlayerStatusProvider } from '@/modules/player/model/player-status-provider';
import { requireRouteLocale } from '@/shared/i18n/route-locale';
import { routing } from '@/shared/i18n/routing';
import SiteBackground from '@/site/background/ui/site-background';
import SiteFooter from '@/site/footer/ui/site-footer';
import SiteHeader from '@/site/header/ui/site-header';
import { ThemeProvider } from '@/site/providers/theme-provider';
import { buildPageMetadata } from '@/site/seo/build-page-metadata';
import StructuredData from '@/site/structured-data/ui/structured-data';

interface LayoutMessages {
  metadata: {
    title: string;
    description: string;
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export function generateViewport() {
  return {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    viewportFit: 'cover',
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = requireRouteLocale(rawLocale);
  const messages = (await getMessages({ locale })) as LayoutMessages;

  return {
    ...buildPageMetadata({
      locale,
      title: messages.metadata.title,
      description: messages.metadata.description,
    }),
    keywords: [
      'Minecraft',
      'Server',
      'Mik',
      'Community',
      'Builds',
      'Wiki',
      locale === 'zh-CN' ? '我的世界' : 'Minecraft',
    ],
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = requireRouteLocale(rawLocale);

  const messages = await getMessages({ locale });

  return (
    <ThemeProvider>
      <NextIntlClientProvider messages={messages}>
        <PlayerStatusProvider>
          <BuildingsProvider>
            <StructuredData />
            <SiteBackground />
            <SiteHeader />
            <main className="relative z-10 flex min-h-0 flex-1 flex-col">{children}</main>
            <SiteFooter />
          </BuildingsProvider>
        </PlayerStatusProvider>
      </NextIntlClientProvider>
    </ThemeProvider>
  );
}
