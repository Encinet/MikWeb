import { createWikiSectionGroups, sortWikiSections } from '@/modules/wiki/lib/wiki-grouping';
import { buildWikiSearchIndex } from '@/modules/wiki/lib/wiki-search';
import type {
  WikiContentBundle,
  WikiSectionOutlineMap,
} from '@/modules/wiki/model/wiki-content-types';
import type { WikiLocale, WikiSectionDocument } from '@/modules/wiki/model/wiki-section-types';
import { parseWikiArticle } from '@/modules/wiki/server/parse-wiki-article';

export function createWikiContentBundle(
  locale: WikiLocale,
  documents: WikiSectionDocument[],
): WikiContentBundle {
  const sections = sortWikiSections(documents.map((document) => document.section));
  const content = Object.fromEntries(
    documents.map((document) => [document.section.id, document.content]),
  );
  const searchIndex = buildWikiSearchIndex(locale, content);
  const outlines: WikiSectionOutlineMap = Object.fromEntries(sections.map(({ id }) => [id, []]));
  for (const { sectionId, heading, level, slug } of searchIndex) {
    if (level === 2 || level === 3) outlines[sectionId].push({ heading, level, slug });
  }
  return {
    articles: Object.fromEntries(
      documents.map(({ section, content, sourcePath }) => [
        section.id,
        parseWikiArticle(content, sourcePath),
      ]),
    ),
    sections,
    sectionGroups: createWikiSectionGroups(sections),
    content,
    outlines,
    searchIndex,
  };
}
