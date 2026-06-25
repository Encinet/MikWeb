import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';

import { requireRouteLocale } from '@/shared/i18n/route-locale';
import { CopyButton } from '@/shared/ui/action/copy-button';
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

  return (
    <div className="page-shell page-shell-stable pcl2-page">
      <section className="pcl2-page__hero page-shell-content">
        <div className="pcl2-page__content">
          <div className="pcl2-page__main">
            <h1>{t('title')}</h1>
            <p className="pcl2-page__description">{t('description')}</p>

            <div className="pcl2-page__address">
              <span>{t('addressLabel')}</span>
              <div className="pcl2-page__address-bar">
                <code>{homepageUrl}</code>
                <CopyButton className="pcl2-page__copy" value={homepageUrl} />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
