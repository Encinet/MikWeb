import assert from 'node:assert/strict';
import { test } from 'node:test';

import { NextIntlClientProvider } from 'next-intl';
import { renderToStaticMarkup } from 'react-dom/server';

import { searchWikiBlocks } from '@/modules/wiki/lib/wiki-search';
import type { SearchableWikiBlock } from '@/modules/wiki/model/wiki-search-types';
import { createWikiContentBundle } from '@/modules/wiki/server/create-wiki-content-bundle';
import { loadWikiSectionDocuments } from '@/modules/wiki/server/load-wiki-documents';
import { WikiMdx } from '@/modules/wiki/ui/wiki-mdx';

import en from '../../messages/en.json';
import zh from '../../messages/zh-CN.json';

test('Wiki search ranks before deduplicating and formats excerpts for the selected results', () => {
  const block = (slug: string, heading: string, text: string): SearchableWikiBlock => ({
    sectionId: 'rules',
    path: 'Rules',
    url: `/en/wiki?section=rules#${slug}`,
    content: text,
    directText: text,
    subtreeText: text,
    searchableText: text,
    heading,
    slug,
    level: 2,
  });
  const highest = block('one', 'Building rules', 'Read   the rules.');
  const other = block('two', 'Building rules', 'Another rules chapter.');
  const entries = [block('one', 'Details', 'See rules.'), highest, other];
  const results = searchWikiBlocks(entries, ['rules']);
  assert.deepEqual(
    results.map(({ slug }) => slug),
    ['one', 'two'],
  );
  assert.equal(results[0].snippet, 'Read the rules.');
  assert.deepEqual(searchWikiBlocks(entries, ['rules'], 1), results.slice(0, 1));
});

test('public page and MCP input exclude staff documents, metadata, and search results', async () => {
  for (const locale of ['zh-CN', 'en'] as const) {
    const documents = await loadWikiSectionDocuments(locale);
    const bundle = createWikiContentBundle(locale, documents);
    assert.ok(documents.every((document) => document.section.access === 'public'));
    assert.equal(
      bundle.sections.some((section) => section.groupId === 'staff'),
      false,
    );
    const json = JSON.stringify(bundle);
    assert.equal(bundle.articles.moderator, undefined);
    assert.equal(json.includes('/tpforce'), false);
    const results = searchWikiBlocks(bundle.searchIndex, ['tpforce'], 20);
    assert.ok(results.every((result) => result.sectionId !== 'moderator'));
  }
});

test('every MDX document renders with registered components and matching outline anchors', async () => {
  for (const locale of ['zh-CN', 'en'] as const) {
    const documents = await loadWikiSectionDocuments(locale, 'all');
    const bundle = createWikiContentBundle(locale, documents);
    for (const document of documents) {
      const id = document.section.id;
      const html = renderToStaticMarkup(
        <NextIntlClientProvider locale={locale} messages={locale === 'en' ? en : zh}>
          <WikiMdx article={bundle.articles[id]} />
        </NextIntlClientProvider>,
      );
      for (const item of bundle.outlines[id]) {
        assert.ok(html.includes(`id="${item.slug}"`), `${id}: ${item.slug}`);
      }
    }
  }
});
