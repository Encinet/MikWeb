import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runSync } from '@mdx-js/mdx';
import { NextIntlClientProvider } from 'next-intl';
import * as runtime from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  formatWikiMdxForSearch,
  parseWikiMarkdownBlocks,
  searchWikiBlocks,
  stripWikiMarkdown,
} from '@/modules/wiki/lib/wiki-search';
import { createWikiContentBundle } from '@/modules/wiki/server/create-wiki-content-bundle';
import { loadWikiSectionDocuments } from '@/modules/wiki/server/load-wiki-documents';
import { wikiMdxComponents } from '@/modules/wiki/ui/wiki-mdx-components';
import en from '../../messages/en.json';
import zh from '../../messages/zh-CN.json';

test('public page and MCP input exclude staff documents, metadata, and search results', async () => {
  for (const locale of ['zh-CN', 'en'] as const) {
    const documents = await loadWikiSectionDocuments(locale);
    const bundle = await createWikiContentBundle(locale, documents);
    assert.equal(documents.length, 6);
    assert.ok(documents.every((document) => document.section.access === 'public'));
    assert.equal(bundle.sections[0]?.id, 'getting-started');
    assert.equal(
      bundle.sections.some((section) => section.id === 'overview'),
      false,
    );
    assert.equal(
      bundle.sections.some((section) => section.groupId === 'staff'),
      false,
    );
    const json = JSON.stringify(bundle);
    assert.equal(bundle.compiled.moderator, undefined);
    assert.equal(json.includes('/tpforce'), false);
    const results = searchWikiBlocks(bundle.searchIndex, ['tpforce'], 20);
    assert.ok(results.every((result) => result.sectionId !== 'moderator'));
    assert.equal(
      documents.some((document) => document.section.id === 'community'),
      false,
    );
    assert.equal(
      documents.filter((document) => document.section.groupId === 'open-source').length,
      1,
    );
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
      assert.ok(html.includes(renderToStaticMarkup(document.section.label)), id);
      for (const item of bundle.outlines[id]) {
        assert.ok(html.includes(`id="${item.slug}"`), `${id}: ${item.slug}`);
      }
      if (id === 'mechanisms') {
        assert.ok(html.includes('wiki-steps'));
        assert.ok(html.includes('wiki-callout'));
        assert.ok(html.includes('<details'));
      }
      if (id === 'projects') {
        assert.ok(html.includes('copy-button'));
      }
      if (id === 'commands') {
        assert.ok(html.includes('wiki-markdown__table-wrap'));
        assert.ok(html.includes('rowSpan') || html.includes('rowspan'));
      }
    }
  }
});

test('rich component titles and contents stay searchable without JSX markup', () => {
  const plain = stripWikiMarkdown(
    '<Step title="留出安全落点">\n\n铁块上方留足站立空间。\n\n</Step>\n<Definitions><Definition title="/menu" code>打开主菜单</Definition></Definitions>',
  );
  assert.ok(plain.includes('留出安全落点'));
  assert.ok(plain.includes('站立空间'));
  assert.equal(plain.includes('<Step'), false);
  assert.ok(plain.includes('/menu'));
  assert.ok(plain.includes('打开主菜单'));
  assert.equal(plain.includes('<Definition'), false);
  const card = formatWikiMdxForSearch(
    '<Cards><Card title="Mik" href="https://github.com/Encinet/mik">Plugin</Card></Cards>',
  );
  assert.ok(card.includes('[Mik](https://github.com/Encinet/mik)'));
  assert.equal(card.includes('<Card'), false);
  const resource = formatWikiMdxForSearch(
    '<Definitions><Definition title="服务器插件">Java / Paper\n\n[源码](https://github.com/Encinet/mik) · [文档](https://github.com/Encinet/mik/blob/main/docs/README.md) · [问题](https://github.com/Encinet/mik/issues)\n\n铁块电梯</Definition></Definitions>',
  );
  assert.ok(resource.includes('服务器插件'));
  assert.ok(resource.includes('Java / Paper'));
  assert.ok(resource.includes('[源码](https://github.com/Encinet/mik)'));
  assert.ok(resource.includes('[文档](https://github.com/Encinet/mik/blob/main/docs/README.md)'));
  assert.ok(resource.includes('[问题](https://github.com/Encinet/mik/issues)'));
  assert.equal(resource.includes('<Definition'), false);
  assert.deepEqual(
    parseWikiMarkdownBlocks(
      'example',
      '# Page\n\n## Instructions\n\n```md\n## Example heading\n```',
    ).map((block) => block.heading),
    ['Page', 'Instructions'],
  );
});
