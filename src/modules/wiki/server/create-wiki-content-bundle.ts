import { compile } from '@mdx-js/mdx';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';
import { createWikiSectionGroups, sortWikiSections } from '@/modules/wiki/lib/wiki-grouping';
import { buildWikiSearchIndex, parseWikiMarkdownBlocks } from '@/modules/wiki/lib/wiki-search';
import type {
  WikiContentBundle,
  WikiLocale,
  WikiSectionDocument,
} from '@/modules/wiki/model/wiki-section-types';

export async function createWikiContentBundle(
  locale: WikiLocale,
  documents: WikiSectionDocument[],
): Promise<WikiContentBundle> {
  const sections = sortWikiSections(documents.map((document) => document.section));
  const content = Object.fromEntries(
    documents.map((document) => [document.section.id, document.content]),
  );
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
    outlines: Object.fromEntries(
      documents.map((document) => [
        document.section.id,
        parseWikiMarkdownBlocks(document.section.id, document.content)
          .filter((block) => block.level >= 2 && block.level <= 3)
          .map(({ heading, level, slug }) => ({ heading, level, slug })),
      ]),
    ),
    searchIndex: buildWikiSearchIndex(locale, content),
  };
}
