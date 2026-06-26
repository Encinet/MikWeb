import { CheckCircle2, Clipboard, RefreshCw, Settings2 } from 'lucide-react';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';

import { requireRouteLocale } from '@/shared/i18n/route-locale';
import { CopyButton } from '@/shared/ui/action/copy-button';
import { ArtGuidePage } from '@/shared/ui/page/art-guide-page';
import { absoluteUrl, getSiteOriginFromHeaders } from '@/shared/url/request-url';
import { getPcl2HomepagePath, PCL2_HOMEPAGE_ROUTE } from '@/site/config/site-config';
import { buildPageMetadata } from '@/site/seo/build-page-metadata';

interface Pcl2PageParams {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Pcl2PageParams): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = requireRouteLocale(rawLocale);
  const t = await getTranslations({ locale, namespace: 'pcl2Page' });

  return buildPageMetadata({
    locale,
    title: t('title'),
    description: t('description'),
    pathname: PCL2_HOMEPAGE_ROUTE,
  });
}

export default async function Pcl2Page({ params }: Pcl2PageParams) {
  const { locale: rawLocale } = await params;
  const locale = requireRouteLocale(rawLocale);
  const t = await getTranslations({ locale, namespace: 'pcl2Page' });
  const siteOrigin = getSiteOriginFromHeaders(await headers());
  const homepagePath = getPcl2HomepagePath(locale);
  const homepageUrl = absoluteUrl(homepagePath, siteOrigin);
  const setupSteps = [
    {
      icon: Settings2,
      title: t('steps.settings.title'),
      description: t('steps.settings.description'),
    },
    {
      icon: RefreshCw,
      title: t('steps.update.title'),
      description: t('steps.update.description'),
    },
    {
      icon: Clipboard,
      title: t('steps.address.title'),
      description: t('steps.address.description'),
    },
    {
      icon: CheckCircle2,
      title: t('steps.done.title'),
      description: t('steps.done.description'),
    },
  ];

  return (
    <ArtGuidePage
      badge={t('badge')}
      guideTitle={t('stepsTitle')}
      steps={setupSteps}
      subtitle={t('subtitle')}
      title={t('title')}
    >
      <div className="art-guide-address">
        <span>{t('addressLabel')}</span>
        <div className="art-guide-address__bar">
          <code>{homepageUrl}</code>
          <CopyButton className="art-guide-address__copy" value={homepageUrl} />
        </div>
      </div>
    </ArtGuidePage>
  );
}
