import HomePage from '@/modules/home/ui/home-page';
import { ClientMessages } from '@/shared/i18n/client-messages';
import { requireRouteLocale } from '@/shared/i18n/route-locale';
import { SiteShareMetadata } from '@/site/seo/site-share-metadata';

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = requireRouteLocale(rawLocale);
  return (
    <>
      <SiteShareMetadata locale={locale} page="home" />
      <ClientMessages locale={locale} namespaces={['home', 'announcements']}>
        <HomePage />
      </ClientMessages>
    </>
  );
}
