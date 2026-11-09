import type { Metadata } from 'next';
import { getJoinPageData } from '@/modules/join/server/join-page-data';
import { JoinPage } from '@/modules/join/ui/join-page';
import { requireRouteLocale } from '@/shared/i18n/route-locale';
import { generateSitePageMetadata } from '@/site/seo/site-page-metadata';
import { SiteShareMetadata } from '@/site/seo/site-share-metadata';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return generateSitePageMetadata(requireRouteLocale(locale), 'join');
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <>
      <SiteShareMetadata locale={requireRouteLocale(locale)} page="join" />
      <JoinPage {...getJoinPageData()} />
    </>
  );
}
