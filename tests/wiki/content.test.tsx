import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runSync } from '@mdx-js/mdx';
import { NextIntlClientProvider } from 'next-intl';
import * as runtime from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import { searchWikiBlocks } from '@/modules/wiki/lib/wiki-search';
import { createWikiContentBundle } from '@/modules/wiki/server/create-wiki-content-bundle';
import { loadWikiSectionDocuments } from '@/modules/wiki/server/load-wiki-documents';
import { wikiMdxComponents } from '@/modules/wiki/ui/wiki-mdx-components';
import en from '../../messages/en.json';
import zh from '../../messages/zh-CN.json';

test('public page and MCP input exclude staff documents, metadata, and search results', async () => {
  for (const locale of ['zh-CN', 'en'] as const) {
    const documents = await loadWikiSectionDocuments(locale);
    const bundle = await createWikiContentBundle(locale, documents);
    assert.ok(documents.every((document) => document.section.access === 'public'));
    assert.equal(
      bundle.sections.some((section) => section.groupId === 'staff'),
      false,
    );
    const json = JSON.stringify(bundle);
    assert.equal(bundle.compiled.moderator, undefined);
    assert.equal(json.includes('/tpforce'), false);
    const results = searchWikiBlocks(bundle.searchIndex, ['tpforce'], 20);
    assert.ok(results.every((result) => result.sectionId !== 'moderator'));
  }
});

test('every MDX document renders with registered components and matching outline anchors', async () => {
  for (const locale of ['zh-CN', 'en'] as const) {
    const documents = await loadWikiSectionDocuments(locale, 'all');
    const bundle = await createWikiContentBundle(locale, documents);
    for (const document of documents) {
      const id = document.section.id;
      const Content = runSync(bundle.compiled[id], runtime).default;
      const html = renderToStaticMarkup(
        <NextIntlClientProvider locale={locale} messages={locale === 'en' ? en : zh}>
          <Content components={wikiMdxComponents} />
        </NextIntlClientProvider>,
      );
      for (const item of bundle.outlines[id]) {
        assert.ok(html.includes(`id="${item.slug}"`), `${id}: ${item.slug}`);
      }
    }
  }
});
