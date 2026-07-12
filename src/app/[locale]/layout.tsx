import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { AuthProvider } from '@/modules/auth/model/auth-provider';
import { BuildingsProvider } from '@/modules/building/model/buildings-provider';
import { PlayerStatusProvider } from '@/modules/player/model/player-status-provider';
import { requireRouteLocale } from '@/shared/i18n/route-locale';
import { routing } from '@/shared/i18n/routing';
import { ToastProvider } from '@/shared/ui/feedback/toast-provider';
import SiteBackground from '@/site/background/ui/site-background';
import SiteFooter from '@/site/footer/ui/site-footer';
import SiteHeader from '@/site/header/ui/site-header';
import { ThemeColor } from '@/site/providers/theme-color';
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
      locale === 'en' ? 'Minecraft' : '我的世界',
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
      <NextIntlClientProvider messages={messages}>
        <ToastProvider>
          <PlayerStatusProvider>
            <AuthProvider initialSessionPresent={initialSessionPresent}>
              <BuildingsProvider>
                <ThemeColor />
                <StructuredData />
                <SiteBackground />
                <SiteHeader />
                <main className="relative z-10 flex min-h-0 flex-1 flex-col">{children}</main>
                <SiteFooter />
              </BuildingsProvider>
            </AuthProvider>
          </PlayerStatusProvider>
        </ToastProvider>
      </NextIntlClientProvider>
    </ThemeProvider>
  );
}
