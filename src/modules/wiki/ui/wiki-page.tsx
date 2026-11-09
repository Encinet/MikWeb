import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { createWikiContentBundle } from '@/modules/wiki/server/create-wiki-content-bundle';
import { loadWikiSectionDocuments } from '@/modules/wiki/server/load-wiki-documents';
import WikiContentGateway from '@/modules/wiki/ui/wiki-content-gateway';
import { requireRouteLocale } from '@/shared/i18n/route-locale';

export default async function WikiPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; section?: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = requireRouteLocale(rawLocale);
  const { q, section } = await searchParams;
  const t = await getTranslations({ locale, namespace: 'wiki' });
  const commonT = await getTranslations({ locale, namespace: 'common' });

  const wikiDocuments = await loadWikiSectionDocuments(locale);
  const bundle = await createWikiContentBundle(locale, wikiDocuments);

  const availableSectionIds = bundle.sections.map((wikiSection) => wikiSection.id);
  const initialSection =
    section && availableSectionIds.includes(section) ? section : (bundle.sections[0]?.id ?? '');
  const initialQuery = q?.trim() ?? '';

  return (
    <Suspense>
      <WikiContentGateway
        {...bundle}
        pageTitle={t('title')}
        navigation={t('navigation.title')}
        onThisPage={t('navigation.onThisPage')}
        searchPlaceholder={t('search.placeholder')}
        searchResultsLabel={t('search.resultsTitle')}
        searchResultsCountTemplate={t('search.resultsCount', { count: '{count}' })}
        searchEmptyTitle={t('search.empty.title')}
        searchEmptyDescription={t('search.empty.description')}
        clearSearchLabel={commonT('actions.clearSearch')}
        initialSection={initialSection}
        initialQuery={initialQuery}
      />
    </Suspense>
  );
}
