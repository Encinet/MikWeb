import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { AuthProvider } from '@/modules/auth/model/auth-provider';
import { BuildingsProvider } from '@/modules/building/model/buildings-provider';
import { ChatAccountGuard } from '@/modules/chat/model/chat-account-guard';
import { PlayerStatusProvider } from '@/modules/player/model/player-status-provider';
import { requireRouteLocale } from '@/shared/i18n/route-locale';
import { routing } from '@/shared/i18n/routing';
import SiteBackground from '@/site/background/ui/site-background';
import SiteFooter from '@/site/footer/ui/site-footer';
import SiteHeader from '@/site/header/ui/site-header';
import { PrintFooter, PrintHeader } from '@/site/print/ui/print-chrome';
import { ThemeColor } from '@/site/providers/theme-color';
import { ThemeProvider } from '@/site/providers/theme-provider';
import { ViewportMetrics } from '@/site/providers/viewport-metrics';
import { buildPageMetadata } from '@/site/seo/build-page-metadata';
import StructuredData from '@/site/structured-data/ui/structured-data';
import { getAccentProperties, getDailyAccentColor } from '@/site/theme/lib/accent-color';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export function generateViewport(): Viewport {
  const defaultPalette = getAccentProperties(getDailyAccentColor());

  return {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    viewportFit: 'cover',
    interactiveWidget: 'resizes-content',
    themeColor: defaultPalette['--palette-dark-bg'],
    colorScheme: 'dark light',
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = requireRouteLocale(rawLocale);
  const messages = await getMessages({ locale });

  return {
    ...buildPageMetadata({
      locale,
      title: messages.metadata.title,
      description: messages.metadata.description,
    }),
    manifest: `/${locale}/manifest.webmanifest`,
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
  const cookieStore = await cookies();
  const initialSessionPresent = Boolean(cookieStore.get('__Host-mik_sid')?.value);

  return (
    <ThemeProvider>
      <ViewportMetrics />
      <NextIntlClientProvider messages={messages}>
        <PlayerStatusProvider>
          <AuthProvider initialSessionPresent={initialSessionPresent}>
            <ChatAccountGuard />
            <BuildingsProvider>
              <ThemeColor />
              <StructuredData />
              <SiteBackground />
              <SiteHeader />
              <PrintHeader locale={locale} />
              <main className="relative z-10 flex min-h-0 flex-1 flex-col">{children}</main>
              <PrintFooter />
              <SiteFooter />
            </BuildingsProvider>
          </AuthProvider>
        </PlayerStatusProvider>
      </NextIntlClientProvider>
    </ThemeProvider>
  );
}
