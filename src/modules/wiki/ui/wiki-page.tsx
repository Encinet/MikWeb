import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { getWikiContent } from '@/modules/wiki/server/wiki-content';
import WikiContentGateway from '@/modules/wiki/ui/wiki-content-gateway';
import { WikiLoading } from '@/modules/wiki/ui/wiki-loading';
import { requireRouteLocale } from '@/shared/i18n/route-locale';

export default function WikiPage(props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; section?: string }>;
}) {
  return (
    <Suspense fallback={<WikiLoading />}>
      <WikiPageContent {...props} />
    </Suspense>
  );
}

async function WikiPageContent({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; section?: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = requireRouteLocale(rawLocale);
  const [{ q, section }, t, commonT, bundle] = await Promise.all([
    searchParams,
    getTranslations({ locale, namespace: 'wiki' }),
    getTranslations({ locale, namespace: 'common' }),
    getWikiContent(locale),
  ]);

  const availableSectionIds = bundle.sections.map((wikiSection) => wikiSection.id);
  const initialSection =
    section && availableSectionIds.includes(section) ? section : (bundle.sections[0]?.id ?? '');
  const initialQuery = q?.trim() ?? '';

  return (
    <WikiContentGateway
      sections={bundle.sections}
      sectionGroups={bundle.sectionGroups}
      compiled={{ [initialSection]: bundle.compiled[initialSection] }}
      outlines={{ [initialSection]: bundle.outlines[initialSection] }}
      searchIndex={[]}
      pageTitle={t('title')}
      navigation={t('navigation.title')}
      onThisPage={t('navigation.onThisPage')}
      searchPlaceholder={t('search.placeholder')}
      searchResultsLabel={t('search.resultsTitle')}
      searchEmptyTitle={t('search.empty.title')}
      searchEmptyDescription={t('search.empty.description')}
      clearSearchLabel={commonT('actions.clearSearch')}
      initialSection={initialSection}
      initialQuery={initialQuery}
    />
  );
}
