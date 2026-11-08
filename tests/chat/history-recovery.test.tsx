import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { NextIntlClientProvider } from 'next-intl';
import { act } from 'react';
import { AuthStateContext } from '@/modules/auth/model/auth-state-context';
import {
  deleteChatHistoryDatabase,
  openChatHistoryDatabase,
} from '@/modules/chat/lib/chat-history-database';
import { ChatSession } from '@/modules/chat/lib/connection/chat-session';
import { useWebChat } from '@/modules/chat/model/use-web-chat';
import { ChatHistoryRecoveryGate } from '@/modules/chat/ui/chat-history-recovery-gate';
import translations from '../../messages/en.json';
import { createBrowserEnvironment } from '../support/browser-environment';
import { OWNER } from './fixtures';

let browser: ReturnType<typeof createBrowserEnvironment>;
let current: ReturnType<typeof useWebChat> | null;
let retries = 0;
let recoveries = 0;
let sends = 0;
const originalRetry = ChatSession.prototype.retry;
const originalRecover = ChatSession.prototype.recover;
const originalSend = ChatSession.prototype.send;

const account = {
  playerUuid: OWNER,
  currentName: 'Owner',
  role: 'member' as const,
  updatedAt: '',
  passkeyCount: 0,
};

function Harness() {
  current = useWebChat();
  return current.historyRecovery ? (
    <ChatHistoryRecoveryGate
      recovery={current.historyRecovery}
      onDelete={current.deleteUnsupportedHistory}
    />
  ) : (
    <output>Chat is ready</output>
  );
}

function state() {
  assert.ok(current);
  return current;
}

async function until(check: () => boolean) {
  for (let attempt = 0; attempt < 100 && !check(); attempt++) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
    });
  }
  assert.ok(check(), 'Chat recovery did not settle');
}

function storedDatabase(initialize = false) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('mik-chat', initialize ? 1 : undefined);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('legacy').put('Preserve this draft', 'draft');
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function render() {
  await act(async () => {
    browser.root.render(
      <NextIntlClientProvider locale="en" messages={translations}>
        <AuthStateContext
          value={{
            account,
            authenticated: true,
            verified: true,
            isLoading: false,
            refresh: async () => account,
            acceptAuthentication: () => {},
            logout: async () => {},
          }}
        >
          <Harness />
        </AuthStateContext>
      </NextIntlClientProvider>,
    );
  });
}

function button(text: string) {
  const button = [...document.querySelectorAll<HTMLButtonElement>('button')].find(
    (button) => button.textContent === text,
  );
  assert.ok(button, `Missing button: ${text}`);
  return button;
}

beforeEach(async () => {
  await deleteChatHistoryDatabase(() => assert.fail('Unexpected blocked deletion'));
  (await storedDatabase(true)).close();
  browser = createBrowserEnvironment();
  current = null;
  retries = recoveries = sends = 0;
  ChatSession.prototype.retry = () => {
    retries++;
  };
  ChatSession.prototype.recover = () => {
    recoveries++;
  };
  ChatSession.prototype.send = () => {
    sends++;
    return { ok: false };
  };
});

afterEach(async () => {
  await browser.close();
  ChatSession.prototype.retry = originalRetry;
  ChatSession.prototype.recover = originalRecover;
  ChatSession.prototype.send = originalSend;
  await deleteChatHistoryDatabase(() => assert.fail('A test leaked an open connection'));
});

test('unsupported history opens a confirmation; cancelling preserves data and blocks every connection entry', async () => {
  await render();
  await until(() => state().historyRecovery === 'required');
  assert.ok(document.querySelector('dialog[aria-describedby]'));
  assert.equal(document.activeElement, button('Cancel'));
  await act(async () => button('Cancel').click());
  assert.equal(document.querySelector('dialog'), null);
  await act(async () => {
    state().retry();
    window.dispatchEvent(new Event('online'));
    window.dispatchEvent(new Event('focus'));
    window.dispatchEvent(new Event('pageshow'));
    assert.equal(state().send({ channel: 'public' }, 'Must not send'), false);
  });
  assert.deepEqual([retries, recoveries, sends], [0, 0, 0]);
  const db = await storedDatabase();
  assert.equal(db.version, 1);
  db.close();
  await act(async () => button('Review cleanup options').click());
  assert.ok(document.querySelector('dialog'));
  await act(async () => button('Delete local data and continue').click());
  await until(() => state().historyRecovery === null && state().historyLease !== null);
  assert.equal(retries, 1);
  assert.equal((await openChatHistoryDatabase()).version, 3);
});

test('blocked deletion reports the other tab and cannot be dismissed until it completes', async () => {
  await render();
  await until(() => state().historyRecovery === 'required');
  const other = await storedDatabase();
  try {
    await act(async () => button('Delete local data and continue').click());
    await until(() => state().historyRecovery === 'blocked');
    assert.equal(button('Delete local data and continue').disabled, true);
    assert.equal(button('Cancel').disabled, true);
    assert.match(document.querySelector('dialog')?.textContent ?? '', /Close other tabs/);
    await act(async () => {
      Reflect.apply(document.dispatchEvent, document, [
        new browser.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      ]);
      state().retry();
    });
    assert.ok(document.querySelector('dialog'));
    assert.equal(retries, 0);
  } finally {
    other.close();
  }
  await until(() => state().historyRecovery === null && state().historyLease !== null);
  assert.equal(retries, 1);
});

test('failed deletion keeps chat blocked and offers another explicit attempt', async () => {
  await render();
  await until(() => state().historyRecovery === 'required');
  const original = indexedDB.deleteDatabase;
  indexedDB.deleteDatabase = () => {
    throw new Error('Deletion unavailable');
  };
  try {
    await act(async () => button('Delete local data and continue').click());
    await until(() => state().historyRecovery === 'failed');
    assert.equal(retries, 0);
    assert.match(document.querySelector('dialog')?.textContent ?? '', /Deletion failed/);
    const db = await storedDatabase();
    assert.equal(db.version, 1);
    db.close();
  } finally {
    indexedDB.deleteDatabase = original;
  }
  await act(async () => button('Delete local data and continue').click());
  await until(() => state().historyRecovery === null && state().historyLease !== null);
  assert.equal(retries, 1);
});

test('ordinary storage failures still allow chat in memory without a deletion prompt', async () => {
  await deleteChatHistoryDatabase(() => {});
  const original = indexedDB.open;
  indexedDB.open = () => {
    throw new Error('Storage unavailable');
  };
  try {
    await render();
    await until(() => state().storageFailed);
    assert.equal(state().historyRecovery, null);
    assert.equal(retries, 1);
    assert.equal(document.querySelector('dialog'), null);
  } finally {
    indexedDB.open = original;
  }
});
