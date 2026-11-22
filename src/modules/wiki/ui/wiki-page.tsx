import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { getWikiContent } from '@/modules/wiki/server/wiki-content';
import WikiContentGateway from '@/modules/wiki/ui/wiki-content-gateway';
import { WikiLoading } from '@/modules/wiki/ui/wiki-loading';
import { requireRouteLocale } from '@/shared/i18n/route-locale';

export default function WikiPage(props: { params: Promise<{ locale: string }> }) {
  return (
    <Suspense fallback={<WikiLoading />}>
      <WikiPageContent {...props} />
    </Suspense>
  );
}

async function WikiPageContent({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = requireRouteLocale(rawLocale);
  const [t, commonT, bundle] = await Promise.all([
    getTranslations({ locale, namespace: 'wiki' }),
    getTranslations({ locale, namespace: 'common' }),
    getWikiContent(locale, 'public'),
  ]);

  // The default article is in the static HTML. The browser selects other articles from the URL.
  const initialSection = bundle.sections[0]?.id;

  return (
    <WikiContentGateway
      sections={bundle.sections}
      sectionGroups={bundle.sectionGroups}
      compiled={initialSection ? { [initialSection]: bundle.compiled[initialSection] } : {}}
      outlines={initialSection ? { [initialSection]: bundle.outlines[initialSection] } : {}}
      searchIndex={[]}
      pageTitle={t('title')}
      navigation={t('navigation.title')}
      onThisPage={t('navigation.onThisPage')}
      searchPlaceholder={t('search.placeholder')}
      searchResultsLabel={t('search.resultsTitle')}
      searchEmptyTitle={t('search.empty.title')}
      searchEmptyDescription={t('search.empty.description')}
      clearSearchLabel={commonT('actions.clearSearch')}
    />
  );
}
