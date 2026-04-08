import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { createWikiSectionGroups, sortWikiSections } from '@/modules/wiki/lib/wiki-grouping';
import { buildWikiSearchIndex, parseWikiMarkdownBlocks } from '@/modules/wiki/lib/wiki-search';
import type {
  SearchableWikiBlock,
  WikiSectionContentMap,
  WikiSectionDocument,
  WikiSectionGroupDefinition,
  WikiSectionOutlineMap,
} from '@/modules/wiki/model/wiki-section-types';
import { loadWikiSectionDocuments } from '@/modules/wiki/server/load-wiki-documents';
import WikiContentView from '@/modules/wiki/ui/wiki-content-view';
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

  const wikiDocuments: WikiSectionDocument[] = await loadWikiSectionDocuments(locale);
  const wikiSections = sortWikiSections(wikiDocuments.map((wikiDocument) => wikiDocument.section));
  const wikiGroups: WikiSectionGroupDefinition[] = createWikiSectionGroups(wikiSections);
  const wikiContentBySection = Object.fromEntries(
    wikiDocuments.map((wikiDocument) => [wikiDocument.section.id, wikiDocument.content]),
  ) as WikiSectionContentMap;
  const wikiOutlineBySection = Object.fromEntries(
    wikiDocuments.map((wikiDocument) => [
      wikiDocument.section.id,
      parseWikiMarkdownBlocks(wikiDocument.section.id, wikiDocument.content)
        .filter((block) => block.level >= 2 && block.level <= 3)
        .map((block) => ({
          heading: block.heading,
          level: block.level,
          slug: block.slug,
        })),
    ]),
  ) as WikiSectionOutlineMap;
  const wikiSearchIndex: SearchableWikiBlock[] = buildWikiSearchIndex(locale, wikiContentBySection);

  const availableSectionIds = wikiSections.map((wikiSection) => wikiSection.id);
  const initialSection =
    section && availableSectionIds.includes(section) ? section : (wikiSections[0]?.id ?? '');
  const initialQuery = q?.trim() ?? '';

  return (
    <Suspense>
      <WikiContentView
        title={t('hero.title')}
        description={t('hero.description')}
        navigation={t('navigation.title')}
        onThisPage={t('navigation.onThisPage')}
        searchPlaceholder={t('search.placeholder')}
        searchResultsLabel={t('search.resultsTitle')}
        searchResultsCountTemplate={t('search.resultsCount', { count: '{count}' })}
        searchEmptyTitle={t('search.empty.title')}
        searchEmptyDescription={t('search.empty.description')}
        clearSearchLabel={t('search.actions.clear')}
        sections={wikiSections}
        sectionGroups={wikiGroups}
        content={wikiContentBySection}
        outlines={wikiOutlineBySection}
        searchIndex={wikiSearchIndex}
        initialSection={initialSection}
        initialQuery={initialQuery}
      />
    </Suspense>
  );
}
