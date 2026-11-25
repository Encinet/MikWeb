import assert from 'node:assert/strict';
import { test } from 'node:test';

import { NextIntlClientProvider } from 'next-intl';
import { SearchParamsContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import { act } from 'react';

import type { WikiSectionDocument } from '@/modules/wiki/model/wiki-section-types';
import { createWikiContentBundle } from '@/modules/wiki/server/create-wiki-content-bundle';
import WikiContentView from '@/modules/wiki/ui/wiki-content-view';

import en from '../../messages/en.json';
import { createBrowserEnvironment } from '../support/browser-environment';

test('static Wiki content follows shared URLs, shallow chapter changes, and Back/Forward', async () => {
  const documents = [
    ['start', 'Getting started'],
    ['rules', 'Server rules'],
  ].map(([id, title], index): WikiSectionDocument => ({
    section: {
      id,
      icon: 'Home',
      label: title,
      description: title,
      order: index,
      groupOrder: 0,
      groupId: 'basics',
      groupLabel: 'Basics',
      access: 'public',
    },
    content: `# ${title}\n\n## Details\n\n${title} details.`,
    sourcePath: `${id}.mdx`,
  }));
  const bundle = createWikiContentBundle('en', documents);
  const environment = createBrowserEnvironment();
  const { window, root, container } = environment;
  Object.defineProperty(window.document, 'visibilityState', { value: 'hidden' });
  const previousFetch = globalThis.fetch;
  const requests: string[] = [];
  globalThis.fetch = Object.assign(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    requests.push(url);
    assert.equal(init?.credentials, 'omit');
    if (url === '/api/wiki/section/en/rules') {
      return Response.json({
        id: 'rules',
        article: bundle.articles.rules,
        outline: bundle.outlines.rules,
      });
    }
    if (url === '/api/wiki/search-index/en/compact') return Response.json(bundle.searchIndex);
    throw new Error(`Unexpected request: ${url}`);
  }, previousFetch);

  const moderator = { ...bundle.sections[0], id: 'moderator', access: 'staff' as const };
  const withStaff = [...bundle.sections, moderator];
  const render = (href: string, staff = false) =>
    act(async () => {
      window.history.pushState(null, '', href);
      root.render(
        <NextIntlClientProvider locale="en" messages={en} timeZone="UTC">
          <SearchParamsContext.Provider value={new URLSearchParams(window.location.search)}>
            <WikiContentView
              sections={staff ? withStaff : bundle.sections}
              sectionGroups={bundle.sectionGroups}
              articles={{
                start: bundle.articles.start,
                ...(staff ? { moderator: bundle.articles.rules } : {}),
              }}
              outlines={{ start: bundle.outlines.start }}
              searchIndex={[]}
              pageTitle="Wiki"
              navigation="Navigation"
              onThisPage="On this page"
              searchPlaceholder="Search"
              searchResultsLabel="Search results"
              searchEmptyTitle="No matches"
              searchEmptyDescription="Try another query"
              clearSearchLabel="Clear"
            />
          </SearchParamsContext.Provider>
        </NextIntlClientProvider>,
      );
    });
  const article = () => container.querySelector('.wiki-markdown')?.getAttribute('data-section');

  try {
    await render('/en/wiki?section=rules#details');
    assert.equal(article(), 'rules');
    assert.ok(container.querySelector('article[data-section="rules"] #details'));

    const start = container.querySelector<HTMLAnchorElement>(
      '.ui-sidebar-link[href="?section=start"]',
    );
    assert.ok(start);
    await act(async () => start.click());
    assert.equal(article(), 'start');
    assert.equal(window.location.search, '?section=start');

    await act(async () => {
      window.history.replaceState({ mikWikiScrollY: 120 }, '', '/en/wiki?section=rules#details');
      window.dispatchEvent(new window.Event('popstate'));
    });
    assert.equal(article(), 'rules');

    await render('/en/wiki');
    assert.equal(article(), 'start');

    await render('/en/wiki?q=server+rules');
    assert.equal(container.querySelector('input')?.value, 'server rules');
    assert.ok(container.querySelector('.wiki-search-results__item'));
    assert.equal(window.location.search, '?q=server+rules');

    const clear = container.querySelector<HTMLButtonElement>('.content-search-field__clear');
    assert.ok(clear);
    await act(async () => clear.click());
    assert.equal(window.location.search, '?section=start');
    assert.equal(article(), 'start');

    await render('/en/wiki?section=moderator');
    assert.equal(article(), 'start');
    assert.equal(container.querySelector('input')?.value, '');
    await render('/en/wiki?section=moderator', true);
    assert.equal(article(), 'moderator');
    await render('/en/wiki');
    const input = container.querySelector('input');
    assert.ok(input);
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set?.call(
        input,
        'server',
      );
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    assert.equal(input.value, 'server');
    assert.equal(window.location.search, '');
    // Staff verification completes while the user's search edit is still debouncing.
    await render('/en/wiki', true);
    assert.equal(input.value, 'server');
    assert.deepEqual(requests, ['/api/wiki/section/en/rules', '/api/wiki/search-index/en/compact']);
  } finally {
    await environment.close();
    globalThis.fetch = previousFetch;
  }
});
