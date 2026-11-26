import '../../../styles/modules/building-archive.css';
import '../../../styles/modules/building-submission.css';

import type { Metadata } from 'next';
import { BuildingSubmissionPage } from '@/modules/building-submission/ui/building-submission-page';
import { ClientMessages } from '@/shared/i18n/client-messages';
import { requireRouteLocale } from '@/shared/i18n/route-locale';
import { generateSitePageMetadata } from '@/site/seo/site-page-metadata';
import { SiteShareMetadata } from '@/site/seo/site-share-metadata';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = requireRouteLocale(rawLocale);
  return generateSitePageMetadata(locale, 'submissions');
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = requireRouteLocale(rawLocale);
  return (
    <>
      <SiteShareMetadata locale={locale} page="submissions" />
      <ClientMessages locale={locale} namespaces={['auth', 'buildingSubmission', 'buildings']}>
        <BuildingSubmissionPage />
      </ClientMessages>
    </>
  );
}
