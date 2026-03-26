import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

import Background from '@/components/Background';
import Footer from '@/components/Footer';
import Navbar from '@/components/Navbar';
import StructuredData from '@/components/StructuredData';
import { ThemeProvider } from '@/components/ThemeProvider';
import { BuildingsContextProvider } from '@/contexts/BuildingsContext';
import { PlayerContextProvider } from '@/contexts/PlayerContext';
import { isRoutingLocale, routing } from '@/i18n/routing';

interface Messages {
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
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const messages = (await getMessages({ locale })) as Messages;

  return {
    title: messages.metadata.title,
    description: messages.metadata.description,
    keywords: [
      'Minecraft',
      'Server',
      'Mik',
      'Community',
      'Builds',
      'Wiki',
      locale === 'zh-CN' ? '我的世界' : 'Minecraft',
    ],
    alternates: {
      canonical: `/${locale}`,
      languages: {
        'zh-CN': '/zh-CN',
        en: '/en',
      },
    },
    openGraph: {
      title: messages.metadata.title,
      description: messages.metadata.description,
      locale: locale === 'zh-CN' ? 'zh_CN' : 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title: messages.metadata.title,
      description: messages.metadata.description,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isRoutingLocale(locale)) {
    notFound();
  }

  const messages = await getMessages({ locale });

  return (
    <ThemeProvider>
      <NextIntlClientProvider messages={messages}>
        <PlayerContextProvider>
          <BuildingsContextProvider>
            <StructuredData />
            <Background />
            <Navbar />
            <main className="relative z-10 flex min-h-0 flex-1 flex-col">{children}</main>
            <Footer />
          </BuildingsContextProvider>
        </PlayerContextProvider>
      </NextIntlClientProvider>
    </ThemeProvider>
  );
}
