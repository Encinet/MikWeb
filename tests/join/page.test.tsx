import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NextIntlClientProvider } from 'next-intl';
import { act } from 'react';
import type { JoinPageData } from '@/modules/join/model/join-group';
import { JoinPage } from '@/modules/join/ui/join-page';
import en from '../../messages/en.json';
import zh from '../../messages/zh-CN.json';
import { createBrowserEnvironment } from '../support/browser-environment';
import { joinPageData } from './join-fixture';

function code(value = '123456', milliseconds = 60000) {
  return Response.json({
    code: value,
    serverTime: Date.now(),
    expiresAt: Date.now() + milliseconds,
  });
}

async function mount(locale: 'zh-CN' | 'en', data: JoinPageData = joinPageData) {
  const environment = createBrowserEnvironment();
  // Only simulate widget events; these tests never solve a real Cap challenge.
  environment.window.customElements.define(
    'cap-widget',
    class extends environment.window.HTMLElement {},
  );
  await act(async () =>
    environment.root.render(
      <NextIntlClientProvider
        locale={locale}
        messages={locale === 'zh-CN' ? zh : en}
        timeZone="Asia/Singapore"
      >
        <JoinPage {...data} />
      </NextIntlClientProvider>,
    ),
  );
  return environment;
}

function button(container: ParentNode, index = 0) {
  const value = container.querySelectorAll<HTMLButtonElement>('.join-group-actions button')[index];
  assert.ok(value);
  return value;
}

async function verify(container: ParentNode, index = 0) {
  const widget = container
    .querySelectorAll('.join-group')
    [index]?.querySelector<HTMLElement>('cap-widget');
  assert.ok(widget);
  widget.tabIndex = 0;
  widget.focus();
  await act(async () =>
    widget.dispatchEvent(new CustomEvent('solve', { detail: { token: 'test-token' } })),
  );
}

async function getCode(container: ParentNode, index = 0) {
  await act(async () => button(container, index).click());
  await verify(container, index);
}

test('both application methods and both QQ links are visible in each language', async () => {
  for (const locale of ['zh-CN', 'en'] as const) {
    const env = await mount(locale);
    try {
      assert.equal(env.container.querySelectorAll('.join-methods > section').length, 2);
      assert.equal(
        env.container.querySelector<HTMLAnchorElement>('.join-form-link')?.getAttribute('href'),
        joinPageData.formUrl,
      );
      assert.equal(env.container.querySelectorAll('.join-group-actions a').length, 2);
      assert.equal(env.container.querySelectorAll('.join-code').length, 0);
      assert.equal(env.container.querySelector('iframe'), null);
      assert.equal(env.container.querySelector('main'), null);
      assert.equal(
        env.container.querySelector('h1')?.textContent,
        locale === 'zh-CN' ? '加入 Mik 社区' : 'Join the Mik community',
      );
    } finally {
      await env.close();
    }
  }
});

test('copying highlights QQ, and expiry restores the request action and focus', async () => {
  const previous = globalThis.fetch;
  const originalClock = Object.getOwnPropertyDescriptor(performance, 'now');
  let now = 1000;
  Object.defineProperty(performance, 'now', { configurable: true, value: () => now });
  globalThis.fetch = Object.assign(async () => code(), previous);
  const env = await mount('zh-CN');
  let copied = '';
  Object.defineProperty(env.window.navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: async (value: string) => {
        copied = value;
      },
    },
  });
  try {
    button(env.container).focus();
    await getCode(env.container);
    assert.equal(env.container.querySelector('output')?.textContent, '123 456');
    assert.equal(env.container.querySelectorAll('.join-group-actions a').length, 2);
    assert.equal(document.activeElement, env.container.querySelector('.copy-button'));
    await act(async () => button(env.container).click());
    assert.equal(copied, '123456');
    assert.ok(env.container.querySelector('.join-group-actions a.ui-action-button--primary'));
    assert.match(env.container.querySelector('.join-message')?.textContent ?? '', /入群验证中粘贴/);
    now += 31_000;
    await act(async () => document.dispatchEvent(new Event('visibilitychange')));
    assert.equal(env.container.querySelector('output')?.textContent, '123 456');
    now += 30_000;
    await act(async () => document.dispatchEvent(new Event('visibilitychange')));
    assert.equal(env.container.querySelector('output'), null);
    assert.equal(button(env.container).textContent, '重新获取');
    assert.equal(document.activeElement, button(env.container));
    assert.equal(env.container.querySelectorAll('.join-group-actions a').length, 2);
    assert.equal(
      env.container.querySelector('.join-form-link')?.getAttribute('href'),
      joinPageData.formUrl,
    );
  } finally {
    await env.close();
    globalThis.fetch = previous;
    if (originalClock) Object.defineProperty(performance, 'now', originalClock);
    else Reflect.deleteProperty(performance, 'now');
  }
});

test('each group keeps its own code when another group responds first', async () => {
  const previous = globalThis.fetch;
  let finishFirst: ((response: Response) => void) | undefined;
  globalThis.fetch = Object.assign(async (_input: RequestInfo | URL, options?: RequestInit) => {
    const { group } = JSON.parse(String(options?.body));
    if (group === '1')
      return new Promise<Response>((resolve) => {
        finishFirst = resolve;
      });
    return code('654321');
  }, previous);
  const env = await mount('en');
  try {
    await getCode(env.container);
    button(env.container, 1).focus();
    await getCode(env.container, 1);
    const secondCopy = env.container
      .querySelectorAll('.join-group')[1]
      ?.querySelector('.copy-button');
    assert.equal(document.activeElement, secondCopy);
    await act(async () => finishFirst?.(code('123456')));
    assert.deepEqual(
      Array.from(env.container.querySelectorAll('output'), (output) => output.textContent),
      ['123 456', '654 321'],
    );
    assert.equal(document.activeElement, secondCopy);
  } finally {
    await env.close();
    globalThis.fetch = previous;
  }
});

test('requests wait for Cap and never reuse its consumed token after a stale response', async () => {
  const previous = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = Object.assign(async (_input: RequestInfo | URL, options?: RequestInit) => {
    requests++;
    assert.deepEqual(JSON.parse(String(options?.body)), { group: '1', token: 'test-token' });
    return code('123456', 1);
  }, previous);
  const env = await mount('zh-CN');
  try {
    await act(async () => button(env.container).click());
    assert.equal(requests, 0);
    assert.equal(env.container.querySelector('output'), null);
    assert.equal(env.container.querySelectorAll('cap-widget').length, 1);
    assert.equal(button(env.container).disabled, true);
    await verify(env.container);
    await act(async () => new Promise((resolve) => setTimeout(resolve, 300)));
    assert.equal(env.container.querySelector('output'), null);
    assert.equal(requests, 1);
    await act(async () => button(env.container).click());
    assert.equal(env.container.querySelectorAll('cap-widget').length, 1);
    assert.equal(requests, 1);
  } finally {
    await env.close();
    globalThis.fetch = previous;
  }
});

test('missing links keep both methods visible without creating broken actions', async () => {
  const env = await mount('zh-CN', {
    ...joinPageData,
    groups: [],
    formUrl: null,
  });
  try {
    assert.equal(env.container.querySelectorAll('.join-methods > section').length, 2);
    assert.equal(env.container.querySelectorAll('.join-methods a').length, 0);
    assert.equal(env.container.querySelectorAll('.join-group').length, 0);
    assert.equal(env.container.querySelectorAll('.join-methods button').length, 0);
    assert.equal(env.container.querySelectorAll('.join-unavailable').length, 2);
  } finally {
    await env.close();
  }
});

test('an unavailable code service offers retry without hiding either application method', async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = Object.assign(
    async () => Response.json({ error: 'unavailable' }, { status: 503 }),
    previous,
  );
  const env = await mount('zh-CN');
  try {
    await getCode(env.container);
    assert.match(env.container.querySelector('.join-message')?.textContent ?? '', /验证码暂不可用/);
    assert.equal(button(env.container).disabled, false);
    assert.equal(env.container.querySelectorAll('.join-group-actions a').length, 2);
    assert.equal(
      env.container.querySelector('.join-form-link')?.getAttribute('href'),
      joinPageData.formUrl,
    );
  } finally {
    await env.close();
    globalThis.fetch = previous;
  }
});

test('cancelling or failing a challenge keeps QQ and the form available and removes stale event handlers', async () => {
  const previous = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = Object.assign(async () => {
    requests++;
    return code();
  }, previous);
  const env = await mount('zh-CN');
  try {
    await act(async () => button(env.container).click());
    const stale = env.container.querySelector('cap-widget');
    const cancel = env.container.querySelector<HTMLButtonElement>('.join-captcha button');
    assert.ok(cancel);
    await act(async () => cancel.click());
    assert.equal(env.container.querySelector('cap-widget'), null);
    assert.equal(document.activeElement, button(env.container));
    await act(async () =>
      stale?.dispatchEvent(new CustomEvent('solve', { detail: { token: 'stale-token' } })),
    );
    assert.equal(requests, 0);
    await act(async () => button(env.container).click());
    await act(async () =>
      env.container.querySelector('cap-widget')?.dispatchEvent(new CustomEvent('error')),
    );
    assert.match(
      env.container.querySelector('.join-message')?.textContent ?? '',
      /人机验证暂不可用/,
    );
    assert.equal(button(env.container).disabled, false);
    assert.equal(env.container.querySelectorAll('.join-group-actions a').length, 2);
    assert.ok(env.container.querySelector('.join-form-link'));
    assert.equal(requests, 0);
  } finally {
    await env.close();
    globalThis.fetch = previous;
  }
});

test('missing Cap configuration cannot expose an unprotected code request action', async () => {
  const env = await mount('en', { ...joinPageData, captcha: null });
  try {
    await act(async () => button(env.container).click());
    assert.equal(env.container.querySelector('cap-widget'), null);
    assert.match(
      env.container.querySelector('.join-message')?.textContent ?? '',
      /Verification is unavailable/,
    );
    assert.equal(env.container.querySelectorAll('.join-group-actions a').length, 2);
  } finally {
    await env.close();
  }
});

test('a failed verification returns focus to retry only when focus was inside the removed widget', async () => {
  const env = await mount('zh-CN');
  try {
    await act(async () => button(env.container).click());
    const widget = env.container.querySelector<HTMLElement>('cap-widget');
    assert.ok(widget);
    widget.tabIndex = 0;
    widget.focus();
    await act(async () => widget.dispatchEvent(new CustomEvent('error')));
    assert.equal(document.activeElement, button(env.container));

    await act(async () => button(env.container).click());
    const otherLink = env.container.querySelector<HTMLAnchorElement>('.join-form-link');
    assert.ok(otherLink);
    otherLink.focus();
    await act(async () =>
      env.container.querySelector('cap-widget')?.dispatchEvent(new CustomEvent('error')),
    );
    assert.equal(document.activeElement, otherLink);
  } finally {
    await env.close();
  }
});

test('resuming after device sleep expires a code even when the monotonic clock has stopped', async () => {
  const previous = globalThis.fetch;
  const previousNow = Date.now;
  const originalClock = Object.getOwnPropertyDescriptor(performance, 'now');
  let wallTime = 1_000_000;
  Date.now = () => wallTime;
  Object.defineProperty(performance, 'now', { configurable: true, value: () => 1000 });
  globalThis.fetch = Object.assign(async () => code(), previous);
  const env = await mount('zh-CN');
  try {
    await getCode(env.container);
    assert.ok(env.container.querySelector('output'));
    wallTime += 61_000;
    await act(async () => document.dispatchEvent(new Event('visibilitychange')));
    assert.equal(env.container.querySelector('output'), null);
    assert.equal(button(env.container).textContent, '重新获取');
  } finally {
    await env.close();
    globalThis.fetch = previous;
    Date.now = previousNow;
    if (originalClock) Object.defineProperty(performance, 'now', originalClock);
    else Reflect.deleteProperty(performance, 'now');
  }
});
