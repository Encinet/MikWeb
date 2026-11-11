import assert from 'node:assert/strict';
import { test } from 'node:test';
import { act } from 'react';
import { useWikiPublicContent } from '@/modules/wiki/model/use-wiki-public-content';
import { createBrowserEnvironment } from '../support/browser-environment';

function Probe({
  section,
  initial = false,
  search = false,
  locale = 'en',
}: {
  section: string | null;
  initial?: boolean;
  search?: boolean;
  locale?: string;
}) {
  const resource = useWikiPublicContent({
    locale,
    sectionId: section,
    hasInitialSection: initial,
    searchEnabled: search,
  });
  return (
    <>
      <output>
        {resource.section?.compiled ?? (resource.sectionFailed ? 'section-error' : 'waiting')}
      </output>
      <span>
        {resource.searchIndex
          ? 'search-ready'
          : resource.searchFailed
            ? 'search-error'
            : 'no-search'}
      </span>
      <button type="button" onClick={resource.retrySection}>
        Retry section
      </button>
      <button type="button" onClick={resource.retrySearch}>
        Retry search
      </button>
    </>
  );
}

test('loads only requested public resources, ignores stale responses, reuses chapters and retries failures', async () => {
  const environment = createBrowserEnvironment();
  const originalFetch = globalThis.fetch;
  const pending: {
    url: string;
    signal?: AbortSignal | null;
    resolve: (response: Response) => void;
  }[] = [];
  globalThis.fetch = Object.assign(async (input: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(init?.credentials, 'omit');
    return new Promise<Response>((resolve) =>
      pending.push({ url: String(input), signal: init?.signal, resolve }),
    );
  }, originalFetch);
  const render = (section: string | null, initial = false, search = false, locale = 'en') =>
    act(async () => {
      environment.root.render(
        <Probe section={section} initial={initial} search={search} locale={locale} />,
      );
    });
  const reply = (index: number, body: unknown, status = 200) =>
    act(async () => {
      pending[index].resolve(Response.json(body, { status }));
    });
  const chapter = (id: string) => ({ id, compiled: `${id}-content`, outline: [] });
  const output = () => environment.container.querySelector('output')?.textContent;
  try {
    await render('getting-started', true);
    await render(null); // Staff content is handled by the authenticated loader.
    assert.equal(pending.length, 0);
    await render('commands');
    await render('rules');
    assert.equal(pending[0].signal?.aborted, true);
    await reply(0, chapter('commands'));
    assert.equal(output(), 'waiting');
    await reply(1, chapter('rules'));
    assert.equal(output(), 'rules-content');
    await render('commands');
    await reply(2, {}, 503);
    assert.equal(output(), 'section-error');
    await act(async () => {
      environment.container.querySelector<HTMLButtonElement>('button')?.click();
    });
    await reply(3, chapter('commands'));
    await render('rules');
    assert.equal(output(), 'rules-content');
    await render('commands');
    assert.equal(output(), 'commands-content');
    assert.equal(pending.length, 4);
    await render('commands', false, true);
    assert.ok(pending[4].url.includes('/search-index?locale=en'));
    await reply(4, {}, 503);
    assert.ok(environment.container.textContent?.includes('search-error'));
    await act(async () => {
      environment.container.querySelectorAll<HTMLButtonElement>('button')[1]?.click();
    });
    await reply(5, []);
    assert.ok(environment.container.textContent?.includes('search-ready'));
    await render('commands');
    await render('commands', false, true);
    assert.equal(pending.length, 6);
    await render('commands', false, true, 'zh-CN');
    assert.equal(output(), 'waiting');
    assert.ok(environment.container.textContent?.includes('no-search'));
    assert.ok(pending[6].url.includes('locale=zh-CN'));
    await reply(6, { ...chapter('commands'), compiled: '中文章节' });
    await reply(7, []);
    assert.equal(output(), '中文章节');
    await render('commands', false, true);
    assert.equal(output(), 'commands-content');
    assert.equal(pending.length, 8);
  } finally {
    await environment.close();
    globalThis.fetch = originalFetch;
  }
});
