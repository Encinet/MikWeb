import HomePage from '@/modules/home/ui/home-page';
import { requireRouteLocale } from '@/shared/i18n/route-locale';
import { SiteShareMetadata } from '@/site/seo/site-share-metadata';

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <>
      <SiteShareMetadata locale={requireRouteLocale(locale)} page="home" />
      <HomePage />
    </>
  );
}
