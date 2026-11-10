import {
  ORGANIZATION_LOGO_URL,
  ORGANIZATION_NAME,
  ORGANIZATION_SOCIAL_LINKS,
  ORGANIZATION_URL,
  SITE_LOGO_PATH,
  SITE_NAME,
  SITE_URL,
} from '@/shared/config/site-config';
import type { AppLocale } from '@/shared/i18n/routing';

export function buildStructuredData({
  locale,
  description,
  organizationDescription,
}: {
  locale: AppLocale;
  description: string;
  organizationDescription: string;
}) {
  const url = `${SITE_URL}/${locale}`;
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      description,
      url,
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${url}/buildings?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
      inLanguage: locale,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: ORGANIZATION_NAME,
      alternateName: 'Mik',
      url: ORGANIZATION_URL,
      logo: ORGANIZATION_LOGO_URL,
      description: organizationDescription,
      sameAs: [...ORGANIZATION_SOCIAL_LINKS],
      subOrganization: {
        '@type': 'Organization',
        name: SITE_NAME,
        url,
        logo: `${SITE_URL}${SITE_LOGO_PATH}`,
        description,
        parentOrganization: { '@type': 'Organization', name: ORGANIZATION_NAME },
      },
    },
  ];
}
