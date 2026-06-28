import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { BuildingSubmissionPage } from '@/modules/building-submission/ui/building-submission-page';
import { requireRouteLocale } from '@/shared/i18n/route-locale';
import { buildPageMetadata } from '@/site/seo/build-page-metadata';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = requireRouteLocale(rawLocale);
  const t = await getTranslations({ locale, namespace: 'buildingSubmission' });

  return buildPageMetadata({
    locale,
    title: t('title'),
    description: t('subtitle'),
    pathname: '/account/building-submissions',
  });
}

export default BuildingSubmissionPage;
