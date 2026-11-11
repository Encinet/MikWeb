import assert from 'node:assert/strict';
import { test } from 'node:test';
import { act } from 'react';
import { useWikiPublicContent } from '@/modules/wiki/model/use-wiki-public-content';
import { createBackgroundEnvironment } from '../support/background-environment';

const candidates = ['commands', 'rules', 'open-source'];
function Probe({
  section = 'getting-started',
  search = false,
}: {
  section?: string;
  search?: boolean;
}) {
  const resource = useWikiPublicContent({
    locale: 'en',
    sectionId: section,
    hasInitialSection: section === 'getting-started',
    searchEnabled: search,
    prefetchSectionIds: candidates,
  });
  return (
    <output>{resource.section?.compiled ?? (resource.sectionFailed ? 'error' : 'initial')}</output>
  );
}

test('prefetch is serial, shares clicked chapters, yields to search and keeps speculative failures out of the UI', async () => {
  const env = createBackgroundEnvironment();
  const originalFetch = globalThis.fetch;
  const requests: {
    url: string;
    signal?: AbortSignal | null;
    priority?: RequestPriority;
    resolve: (response: Response) => void;
  }[] = [];
  globalThis.fetch = Object.assign(
    async (url: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((resolve, reject) => {
        requests.push({
          url: String(url),
          signal: init?.signal,
          priority: init?.priority,
          resolve,
        });
        init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true });
      }),
    originalFetch,
  );
  const render = (section?: string, search = false) =>
    act(async () => {
      env.root.render(<Probe section={section} search={search} />);
    });
  const reply = (index: number, id?: string, status = 200) =>
    act(async () => {
      requests[index].resolve(
        Response.json(id ? { id, compiled: `${id}-body`, outline: [] } : [], { status }),
      );
    });
  try {
    await render();
    assert.equal(requests.length, 0);
    env.state.ready = 'complete';
    window.dispatchEvent(new Event('load'));
    await env.runIdle();
    assert.equal(requests.length, 1);
    assert.equal(requests[0].priority, 'low');
    assert.equal(env.idle.size, 0, 'no second request before the first finishes');
    await render('commands');
    assert.equal(requests.length, 1, 'a click shares its in-flight prefetch');
    assert.equal(requests[0].signal?.aborted, false);
    await reply(0, 'commands');
    assert.equal(env.container.textContent, 'commands-body');
    await env.runIdle();
    assert.ok(requests[1].url.includes('section=rules'));
    await render('commands', true);
    assert.equal(requests[1].signal?.aborted, true);
    assert.ok(requests[2].url.includes('/search-index?'));
    assert.equal(requests[2].priority, 'auto');
    await reply(2);
    await render('commands');
    await env.runIdle();
    assert.ok(requests[3].url.includes('section=rules'));
    await reply(3, undefined, 503);
    assert.equal(env.container.textContent, 'commands-body');
    await env.runIdle();
    assert.ok(requests[4].url.includes('section=open-source'));
    await reply(4, 'open-source');
    await env.runIdle();
    assert.equal(requests.length, 5, 'cached search index and chapters are not fetched twice');
    await render('rules');
    assert.equal(requests[5].priority, 'auto', 'a failed prefetch is retried on demand');
    await reply(5, 'rules');
    assert.equal(env.container.textContent, 'rules-body');
  } finally {
    await env.close();
    globalThis.fetch = originalFetch;
  }
});

test('hiding the Wiki aborts prefetch; restoring visibility retries it and unmount cancels pending work', async () => {
  const env = createBackgroundEnvironment();
  const originalFetch = globalThis.fetch;
  const requests: { url: string; signal?: AbortSignal | null }[] = [];
  globalThis.fetch = Object.assign(
    async (url: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_, reject) => {
        requests.push({ url: String(url), signal: init?.signal });
        init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true });
      }),
    originalFetch,
  );
  try {
    env.state.ready = 'complete';
    await act(async () => {
      env.root.render(<Probe />);
    });
    await env.runIdle();
    await act(async () => {
      env.state.visibility = 'hidden';
      document.dispatchEvent(new Event('visibilitychange'));
    });
    assert.equal(requests[0].signal?.aborted, true);
    assert.equal(env.idle.size, 0);
    env.state.visibility = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    await env.runIdle();
    assert.equal(requests[1].url, requests[0].url);
    await act(async () => {
      env.root.render(null);
    });
    assert.equal(requests[1].signal?.aborted, true);
    assert.equal(env.idle.size, 0);
  } finally {
    await env.close();
    globalThis.fetch = originalFetch;
  }
});
