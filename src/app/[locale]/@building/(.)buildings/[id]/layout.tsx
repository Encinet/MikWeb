import type { ReactNode } from 'react';
import { ClientMessages } from '@/shared/i18n/client-messages';
import { requireRouteLocale } from '@/shared/i18n/route-locale';

export default async function GalleryLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <ClientMessages locale={requireRouteLocale(locale)} namespaces={['buildings']}>
      {children}
    </ClientMessages>
  );
}
