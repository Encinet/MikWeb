import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { requireRouteLocale } from '@/lib/routeLocale';
import type {
  SearchableWikiBlock,
  WikiSectionContentMap,
  WikiSectionDocument,
  WikiSectionGroupDefinition,
  WikiSectionOutlineMap,
} from '@/lib/types';
import { createWikiSectionGroups, sortWikiSections } from '@/lib/wiki';
import { loadWikiSectionDocuments } from '@/lib/wikiContent';
import { buildWikiSearchIndex, parseWikiMarkdownBlocks } from '@/lib/wikiSearch';

import WikiContent from './WikiContent';

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
      <WikiContent
        title={t('title')}
        description={t('description')}
        navigation={t('navigation')}
        onThisPage={t('onThisPage')}
        searchPlaceholder={t('searchPlaceholder')}
        searchResultsLabel={t('searchResultsLabel')}
        searchResultsCountTemplate={t('searchResultsCount', { count: '{count}' })}
        searchEmptyTitle={t('searchEmptyTitle')}
        searchEmptyDescription={t('searchEmptyDescription')}
        clearSearchLabel={t('clearSearch')}
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
