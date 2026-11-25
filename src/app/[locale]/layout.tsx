import '../globals.css';

import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { AuthProvider } from '@/modules/auth/model/auth-provider';
import { ChatAccountGuard } from '@/modules/chat/model/chat-account-guard';
import { SITE_NAME, SITE_SHORT_NAME } from '@/shared/config/site-config';
import { ClientMessages } from '@/shared/i18n/client-messages';
import { requireRouteLocale } from '@/shared/i18n/route-locale';
import { routing } from '@/shared/i18n/routing';
import SiteBackground from '@/site/background/ui/site-background';
import SiteFooter from '@/site/footer/ui/site-footer';
import SiteHeader from '@/site/header/ui/site-header';
import SiteDocument, { getDocumentNonce } from '@/site/layout/site-document';
import { PrintFooter, PrintHeader } from '@/site/print/ui/print-chrome';
import { PrintPreparation } from '@/site/print/ui/print-preparation';
import { ThemeColor } from '@/site/providers/theme-color';
import { ThemeProvider } from '@/site/providers/theme-provider';
import { ViewportMetrics } from '@/site/providers/viewport-metrics';
import { PAGE_TITLE_TEMPLATE } from '@/site/seo/page-title';
import { siteMetadata } from '@/site/seo/site-metadata';
import { generateSitePageMetadata } from '@/site/seo/site-page-metadata';
import StructuredData from '@/site/structured-data/ui/structured-data';
import { DEFAULT_ACCENT_PROPERTIES } from '@/site/theme/lib/default-accent';

// The document and Next.js startup scripts need the current request's CSP nonce.
export const instant = false;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
  themeColor: DEFAULT_ACCENT_PROPERTIES['--palette-dark-bg'],
  colorScheme: 'dark light',
};

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
      default: homeMetadata.title.absolute,
      template: PAGE_TITLE_TEMPLATE,
    },
    manifest: `/${locale}/manifest.webmanifest`,
    keywords: [
      'Minecraft',
      'Server',
      SITE_NAME,
      SITE_SHORT_NAME,
      'Community',
      'Builds',
      'Wiki',
      ...(locale === 'zh-CN' ? ['我的世界'] : []),
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
  const nonce = await getDocumentNonce();

  return (
    <SiteDocument locale={locale} nonce={nonce} variant="site">
      <ThemeProvider nonce={nonce}>
        <ViewportMetrics />
        <ClientMessages locale={locale}>
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
        </ClientMessages>
      </ThemeProvider>
    </SiteDocument>
  );
}
