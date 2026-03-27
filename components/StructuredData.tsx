import { routing } from '@/i18n/routing';
import {
  ORGANIZATION_DESCRIPTION,
  ORGANIZATION_LOGO_URL,
  ORGANIZATION_NAME,
  ORGANIZATION_SOCIAL_LINKS,
  ORGANIZATION_URL,
  SITE_DESCRIPTION,
  SITE_LOGO_PATH,
  SITE_NAME,
  SITE_URL,
} from '@/lib/site';

export default function StructuredData() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/buildings?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
    inLanguage: routing.locales,
  };

  const organizationData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: ORGANIZATION_NAME,
    alternateName: 'Mik',
    url: ORGANIZATION_URL,
    logo: ORGANIZATION_LOGO_URL,
    description: ORGANIZATION_DESCRIPTION,
    sameAs: [...ORGANIZATION_SOCIAL_LINKS],
    subOrganization: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}${SITE_LOGO_PATH}`,
      description: SITE_DESCRIPTION,
      parentOrganization: {
        '@type': 'Organization',
        name: ORGANIZATION_NAME,
      },
    },
  };

  return (
    <>
      <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      <script type="application/ld+json">{JSON.stringify(organizationData)}</script>
    </>
  );
}
