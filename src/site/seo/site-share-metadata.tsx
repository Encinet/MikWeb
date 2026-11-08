import 'server-only';

import type { AppLocale } from '@/shared/i18n/routing';
import { ShareTextMetadata } from '@/site/seo/share-text-metadata';
import { getSitePageContent } from '@/site/seo/site-page-metadata';
import type { SitePage } from '@/site/seo/site-pages';

export async function SiteShareMetadata({ locale, page }: { locale: AppLocale; page: SitePage }) {
  const { title, description } = await getSitePageContent(locale, page);
  return (
    <ShareTextMetadata
      title={title}
      description={description}
      target={{ kind: 'site', locale, page }}
    />
  );
}
