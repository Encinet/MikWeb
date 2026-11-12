import { getTranslations } from 'next-intl/server';
import { SITE_TRANSLATION_VALUES } from '@/shared/config/site-config';
import type { AppLocale } from '@/shared/i18n/routing';
import { buildStructuredData } from '@/site/structured-data/lib/build-structured-data';

export default async function StructuredData({ locale }: { locale: AppLocale }) {
  const t = await getTranslations({ locale, namespace: 'metadata' });
  const entries = buildStructuredData({
    locale,
    description: t('description'),
    organizationDescription: t('organizationDescription', SITE_TRANSLATION_VALUES),
  });
  return entries.map((entry) => (
    <script key={entry['@type']} type="application/ld+json">
      {JSON.stringify(entry).replace(/</g, '\\u003c')}
    </script>
  ));
}
