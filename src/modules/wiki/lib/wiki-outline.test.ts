import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  captureWikiReadingAnchor,
  getActiveWikiSlug,
  getWikiHistoryScroll,
  pushWikiHistory,
  resolveWikiReadingAnchor,
} from '@/modules/wiki/lib/wiki-outline';

describe('Wiki reading continuity', () => {
  const portrait = [
    { slug: '', top: 300 },
    { slug: 'first', top: 500 },
    { slug: 'child', top: 900 },
    { slug: 'second', top: 1700 },
  ];
  const landscape = [
    { slug: '', top: 200 },
    { slug: 'first', top: 360 },
    { slug: 'child', top: 600 },
    { slug: 'second', top: 1000 },
  ];

  test('keeps the same subsection and progress when text reflows', () => {
    const anchor = captureWikiReadingAnchor(portrait, 1300, 2500);
    assert.deepEqual(anchor, { slug: 'child', progress: 0.5 });
    assert.ok(anchor);
    const line = resolveWikiReadingAnchor(landscape, anchor, 1600);
    assert.equal(line, 800);
    assert.equal(getActiveWikiSlug(landscape, line), 'child');
  });

  test('preserves reading within the introduction and the final chapter', () => {
    const intro = captureWikiReadingAnchor(portrait, 400, 2500);
    assert.ok(intro);
    assert.equal(resolveWikiReadingAnchor(landscape, intro, 1600), 280);
    const final = captureWikiReadingAnchor(portrait, 2100, 2500);
    assert.ok(final);
    assert.equal(resolveWikiReadingAnchor(landscape, final, 1600), 1300);
  });

  test('does not pull the reader from the page header or footer back into the article', () => {
    assert.equal(captureWikiReadingAnchor(portrait, 100, 2500), null);
    assert.equal(captureWikiReadingAnchor(portrait, 2500, 2500), null);
    assert.equal(captureWikiReadingAnchor([], 100, 2500), null);
    assert.equal(
      resolveWikiReadingAnchor(landscape, { slug: 'missing', progress: 0.5 }, 1600),
      undefined,
    );
  });

  test('retains the scroll position in browser history before a chapter jump', () => {
    const writes: { state: unknown; url: string | URL | null | undefined }[] = [];
    const history = {
      state: { existing: true },
      replaceState: (state: unknown, _unused: string, url?: string | URL | null) => {
        writes.push({ state, url });
      },
      pushState: (state: unknown, _unused: string, url?: string | URL | null) => {
        writes.push({ state, url });
      },
    };
    pushWikiHistory(
      history,
      'https://example.com/wiki?section=rules',
      '?section=rules#second',
      1200,
    );
    assert.equal(writes.length, 2);
    assert.equal(getWikiHistoryScroll(writes[0].state), 1200);
    assert.equal(getWikiHistoryScroll(writes[1].state), undefined);
    assert.equal(writes[1].url, '?section=rules#second');
  });
});
