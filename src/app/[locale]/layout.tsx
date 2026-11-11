import '../globals.css';

import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Suspense } from 'react';
import { AuthProvider } from '@/modules/auth/model/auth-provider';
import { ChatAccountGuard } from '@/modules/chat/model/chat-account-guard';
import { PlayerStatusProvider } from '@/modules/player/model/player-status-provider';
import { SITE_NAME } from '@/shared/config/site-config';
import { DEFAULT_ACCENT_COLOR } from '@/shared/config/theme-config';
import { requireRouteLocale } from '@/shared/i18n/route-locale';
import { routing } from '@/shared/i18n/routing';
import SiteBackground from '@/site/background/ui/site-background';
import SiteFooter from '@/site/footer/ui/site-footer';
import SiteHeader from '@/site/header/ui/site-header';
import SiteDocument from '@/site/layout/site-document';
import { PrintFooter, PrintHeader } from '@/site/print/ui/print-chrome';
import { PrintPreparation } from '@/site/print/ui/print-preparation';
import { ThemeColor } from '@/site/providers/theme-color';
import { ThemeProvider } from '@/site/providers/theme-provider';
import { ViewportMetrics } from '@/site/providers/viewport-metrics';
import { siteMetadata } from '@/site/seo/site-metadata';
import { generateSitePageMetadata } from '@/site/seo/site-page-metadata';
import StructuredData from '@/site/structured-data/ui/structured-data';
import { getAccentProperties } from '@/site/theme/lib/accent-color';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export function generateViewport(): Viewport {
  const defaultPalette = getAccentProperties(DEFAULT_ACCENT_COLOR);

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
  const homeMetadata = await generateSitePageMetadata(locale, 'home');

  return {
    ...siteMetadata,
    ...homeMetadata,
    title: {
      default: `${homeMetadata.title} | ${SITE_NAME}`,
      template: `%s | ${SITE_NAME}`,
    },
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
  building,
  params,
}: {
  children: React.ReactNode;
  building: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = requireRouteLocale(rawLocale);

  const messages = await getMessages({ locale });

  return (
    <SiteDocument locale={locale}>
      <ThemeProvider>
        <ViewportMetrics />
        <NextIntlClientProvider messages={messages}>
          <PlayerStatusProvider>
            <AuthProvider>
              <ChatAccountGuard />
              <ThemeColor />
              <StructuredData locale={locale} />
              <SiteBackground />
              <Suspense>
                <SiteHeader />
              </Suspense>
              <PrintHeader locale={locale} />
              <PrintPreparation />
              <main className="app-main relative z-10 flex flex-1 flex-col">
                {children}
                {building}
              </main>
              <PrintFooter />
              <SiteFooter />
            </AuthProvider>
          </PlayerStatusProvider>
        </NextIntlClientProvider>
      </ThemeProvider>
    </SiteDocument>
  );
}
