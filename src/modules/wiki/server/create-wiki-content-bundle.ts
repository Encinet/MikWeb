import { compile } from '@mdx-js/mdx';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';
import { createWikiSectionGroups, sortWikiSections } from '@/modules/wiki/lib/wiki-grouping';
import { buildWikiSearchIndex } from '@/modules/wiki/lib/wiki-search';
import type {
  WikiContentBundle,
  WikiSectionOutlineMap,
} from '@/modules/wiki/model/wiki-content-types';
import type { WikiLocale, WikiSectionDocument } from '@/modules/wiki/model/wiki-section-types';

export async function createWikiContentBundle(
  locale: WikiLocale,
  documents: WikiSectionDocument[],
): Promise<WikiContentBundle> {
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
    compiled: Object.fromEntries(
      await Promise.all(
        documents.map(async (document) => [
          document.section.id,
          String(
            await compile(
              { value: document.content, path: document.sourcePath },
              {
                outputFormat: 'function-body',
                development: false,
                remarkPlugins: [remarkGfm],
                rehypePlugins: [rehypeSlug],
              },
            ),
          ),
        ]),
      ),
    ),
    sections,
    sectionGroups: createWikiSectionGroups(sections),
    content,
    outlines,
    searchIndex,
  };
}
