import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { act } from 'react';
import { focusChatConversation } from '@/modules/chat/lib/chat-conversation-focus';
import type { ChatConnection } from '@/modules/chat/model/chat-connection';
import type { ChatUnread } from '@/modules/chat/model/chat-reading';
import { ChatConnectionBanner } from '@/modules/chat/ui/chat-connection-banner';
import { ChatMessageList } from '@/modules/chat/ui/chat-message-list';
import { useChatScroll } from '@/modules/chat/ui/use-chat-scroll';
import translations from '../../messages/zh-CN.json';
import { message, OWNER } from '../chat/fixtures';
import { createBrowserEnvironment } from '../support/browser-environment';

let browser: ReturnType<typeof createBrowserEnvironment>;
beforeEach(() => {
  browser = createBrowserEnvironment();
});
afterEach(async () => browser.close());

function localized(children: ReactNode) {
  return (
    <NextIntlClientProvider locale="zh-CN" timeZone="Asia/Singapore" messages={translations}>
      {children}
    </NextIntlClientProvider>
  );
}

function Timeline({ unread }: { unread?: ChatUnread }) {
  const scroll = useChatScroll('public');
  return (
    <ChatMessageList
      conversation="public"
      destination={{ channel: 'public' }}
      title="公共"
      owner={OWNER}
      name="Owner"
      messages={[
        message({ id: 'read', sequence: 1 }),
        message({ id: 'unread', sequence: 2 }),
        message({ id: 'latest', sequence: 3 }),
      ]}
      pending={[]}
      unread={unread}
      jump={null}
      paused
      scroll={scroll}
      onRead={() => undefined}
      onRestore={() => undefined}
      onJumpComplete={() => undefined}
      showActivity={false}
      onMention={() => undefined}
      onPrivate={() => undefined}
    />
  );
}

async function readHistory() {
  const log = document.querySelector<HTMLDivElement>('[role="log"]');
  assert.ok(log);
  Object.defineProperties(log, {
    scrollHeight: { configurable: true, value: 1000 },
    clientHeight: { configurable: true, value: 200 },
  });
  await act(async () => {
    log.scrollTop = 0;
    log.dispatchEvent(new Event('scroll', { bubbles: true }));
  });
  return log;
}

function Status({ connection, onRetry }: { connection: ChatConnection; onRetry: () => void }) {
  return connection.status === 'online' ? null : (
    <ChatConnectionBanner connection={connection} onRetry={onRetry} />
  );
}

function connectionTimers() {
  let sequence = 0;
  const timers = new Map<number, () => void>();
  Object.defineProperties(browser.window, {
    setTimeout: {
      configurable: true,
      value: (callback: () => void) => {
        timers.set(++sequence, callback);
        return sequence;
      },
    },
    clearTimeout: {
      configurable: true,
      value: (id: number) => timers.delete(id),
    },
  });
  return {
    timers,
    async advance() {
      const callbacks = [...timers.values()];
      timers.clear();
      await act(async () => {
        for (const callback of callbacks) callback();
      });
    },
  };
}

test('conversation selection focuses reading on narrow or touch screens and preserves desktop composition', async () => {
  await act(async () =>
    browser.root.render(
      <>
        <div role="log" tabIndex={-1} data-timeline />
        <input aria-label="Message" defaultValue="Unsent draft" />
      </>,
    ),
  );
  const timeline = document.querySelector<HTMLElement>('[data-timeline]');
  const composer = document.querySelector('input');
  assert.ok(timeline && composer);
  for (const { width, touch, reading } of [
    { width: 390, touch: 5, reading: true },
    { width: 760, touch: 0, reading: true },
    { width: 1280, touch: 5, reading: true },
    { width: 1280, touch: 0, reading: false },
  ]) {
    browser.window.happyDOM.setViewport({ width });
    Object.defineProperty(browser.window.navigator, 'maxTouchPoints', {
      configurable: true,
      value: touch,
    });
    (reading ? composer : timeline).focus();
    timeline.scrollTop = 123;
    focusChatConversation(timeline, composer);
    assert.equal(
      document.activeElement === (reading ? timeline : composer),
      true,
      `${width}px, ${touch} touch points`,
    );
    assert.equal(timeline.scrollTop, 123);
    assert.equal(composer.value, 'Unsent draft');
  }
});

test('the compact reading bar keeps first-unread and latest actions independent and restores reading focus', async () => {
  await act(async () =>
    browser.root.render(localized(<Timeline unread={{ count: 2, firstId: 'unread' }} />)),
  );
  assert.equal(document.querySelector('.chat-scroll-actions'), null);
  const log = await readHistory();
  const bar = document.querySelector('fieldset.chat-scroll-actions');
  assert.ok(bar);
  assert.equal(bar.getAttribute('aria-label'), '消息导航');
  assert.equal(bar.querySelectorAll('button').length, 2);
  const unread = bar.querySelector<HTMLButtonElement>('.chat-scroll-unread');
  const latest = bar.querySelector<HTMLButtonElement>('.chat-scroll-latest');
  const target = document.querySelector<HTMLElement>('[data-chat-message="unread"]');
  assert.ok(unread && latest && target);
  assert.equal(unread.textContent, '首条未读（2）');
  Object.defineProperty(target, 'getBoundingClientRect', {
    configurable: true,
    value: () => new browser.window.DOMRect(0, 300, 200, 30),
  });
  await act(async () => unread.click());
  assert.equal(log.scrollTop, 276);
  assert.equal(document.activeElement, target);
  assert.equal(document.querySelector('.chat-scroll-actions'), bar);
  await act(async () => latest.click());
  assert.equal(log.scrollTop, 1000);
  assert.equal(document.activeElement, log);
  assert.equal(document.querySelector('.chat-scroll-actions'), null);
});

test('without unread messages the same reading bar exposes one labelled latest action', async () => {
  await act(async () => browser.root.render(localized(<Timeline />)));
  const log = await readHistory();
  const buttons = document.querySelectorAll<HTMLButtonElement>('.chat-scroll-actions button');
  assert.equal(buttons.length, 1);
  assert.equal(buttons[0].textContent, '回到最新');
  await act(async () => buttons[0].click());
  assert.equal(document.activeElement, log);
  assert.equal(document.querySelector('.chat-scroll-actions'), null);
});

test('quick recovery cancels its notice and sustained reconnection uses one grace period across authorization', async () => {
  const clock = connectionTimers();
  const onRetry = () => undefined;
  const render = (connection: ChatConnection) =>
    act(async () =>
      browser.root.render(localized(<Status connection={connection} onRetry={onRetry} />)),
    );
  await render({ status: 'reconnecting', error: 'connection_failed' });
  assert.equal(document.querySelector('.chat-connection-banner'), null);
  assert.equal(clock.timers.size, 1);
  await render({ status: 'online' });
  assert.equal(clock.timers.size, 0);
  await clock.advance();
  assert.equal(document.querySelector('.chat-connection-banner'), null);
  await render({ status: 'reconnecting', error: 'connection_failed' });
  const timer = [...clock.timers.keys()][0];
  await render({ status: 'authorizing' });
  assert.deepEqual([...clock.timers.keys()], [timer]);
  await clock.advance();
  assert.equal(document.querySelectorAll('.chat-connection-banner').length, 1);
  assert.equal(document.querySelector('[role="status"]')?.textContent, '正在重新连接…');
  assert.equal(document.querySelector('.chat-connection-banner button'), null);
});

test('a failed connection shows its error and retry action immediately and cancels its timer on recovery', async () => {
  const clock = connectionTimers();
  let retries = 0;
  await act(async () =>
    browser.root.render(
      localized(
        <Status
          connection={{ status: 'error', error: 'connection_failed' }}
          onRetry={() => {
            retries++;
          }}
        />,
      ),
    ),
  );
  assert.ok(document.querySelector('[role="alert"]')?.textContent);
  const retry = document.querySelector<HTMLButtonElement>('.chat-connection-banner button');
  assert.ok(retry);
  await act(async () => retry.click());
  assert.equal(retries, 1);
  await act(async () =>
    browser.root.render(
      localized(<Status connection={{ status: 'online' }} onRetry={() => undefined} />),
    ),
  );
  assert.equal(clock.timers.size, 0);
  assert.equal(document.querySelector('.chat-connection-banner'), null);
});
