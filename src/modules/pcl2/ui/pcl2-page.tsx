import { getTranslations } from 'next-intl/server';
import { getPcl2HomepagePath } from '@/modules/pcl2/lib/pcl2-homepage-path';
import { SITE_TRANSLATION_VALUES } from '@/shared/config/site-config';
import { requireRouteLocale } from '@/shared/i18n/route-locale';
import { ArtGuidePage } from '@/shared/ui/page/art-guide-page';
import { Pcl2HomepageAddress } from './pcl2-homepage-address';

interface Pcl2PageParams {
  params: Promise<{ locale: string }>;
}

export default async function Pcl2Page({ params }: Pcl2PageParams) {
  const { locale: rawLocale } = await params;
  const locale = requireRouteLocale(rawLocale);
  const t = await getTranslations({ locale, namespace: 'pcl2' });
  const commonT = await getTranslations({ locale, namespace: 'common' });
  const homepagePath = getPcl2HomepagePath(locale);
  const setupSteps = [
    {
      title: t('steps.settings.title'),
      description: t('steps.settings.description'),
    },
    {
      title: t('steps.address.title'),
      description: t('steps.address.description'),
    },
    {
      title: t('steps.done.title'),
      description: t('steps.done.description', SITE_TRANSLATION_VALUES),
    },
  ];

  return (
    <ArtGuidePage
      guideTitle={t('stepsTitle')}
      steps={setupSteps}
      subtitle={t('subtitle', SITE_TRANSLATION_VALUES)}
      title={t('title')}
    >
      <Pcl2HomepageAddress
        baseUrl={homepagePath}
        copyLabel={commonT('actions.copyAddress')}
        detectingLabel={t('detectingTimeZone')}
        label={t('addressLabel')}
      />
    </ArtGuidePage>
  );
}
