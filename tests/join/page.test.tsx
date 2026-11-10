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
