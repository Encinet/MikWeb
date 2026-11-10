import { getTranslations } from 'next-intl/server';
import type { AppLocale } from '@/shared/i18n/routing';
import { buildStructuredData } from '@/site/structured-data/lib/build-structured-data';

export default async function StructuredData({ locale }: { locale: AppLocale }) {
  const t = await getTranslations({ locale, namespace: 'metadata' });
  const entries = buildStructuredData({
    locale,
    description: t('description'),
    organizationDescription: t('organizationDescription'),
  });
  return entries.map((entry) => (
    <script key={entry['@type']} type="application/ld+json">
      {JSON.stringify(entry).replace(/</g, '\\u003c')}
    </script>
  ));
}
