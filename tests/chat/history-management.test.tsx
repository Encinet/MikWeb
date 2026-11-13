import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { NextIntlClientProvider } from 'next-intl';
import { act, useState } from 'react';
import type { HistoryCleanup, HistoryLease } from '@/modules/chat/lib/chat-history';
import {
  clearHistoryThrough,
  enableHistory,
  loadChatWorkspace,
  loadHistory,
  resetHistory,
  saveChatWorkspace,
  saveHistory,
  setStaffHistoryPermission,
  syncHistoryAccount,
} from '@/modules/chat/lib/chat-history';
import { deleteChatHistoryDatabase } from '@/modules/chat/lib/chat-history-database';
import { emptyChatWorkspace } from '@/modules/chat/model/chat-workspace';
import { ChatSettings } from '@/modules/chat/ui/chat-settings';
import translations from '../../messages/en.json';
import { createBrowserEnvironment } from '../support/browser-environment';
import { message, OWNER, order, PEER } from './fixtures';

let browser: ReturnType<typeof createBrowserEnvironment>;
let initial: HistoryLease;
let active: HistoryLease;
let cleanups: HistoryCleanup[];
let failCleanup: boolean;
let changeStaff: (staff: boolean) => void;
let available: boolean;
let pendingCleanup: Promise<void> | null;
let persistenceChanges: boolean[];

function Harness() {
  const [lease, setLease] = useState(initial);
  const [storageFailed, setStorageFailed] = useState(false);
  const [staff, setStaff] = useState(true);
  const [persist, setPersist] = useState(true);
  changeStaff = setStaff;
  active = lease;
  return (
    <NextIntlClientProvider locale="en" timeZone="UTC" messages={translations}>
      <ChatSettings
        chat={{
          historyLease: available ? lease : null,
          persist,
          staff,
          storageFailed,
          setPersistence: async (enabled) => {
            persistenceChanges.push(enabled);
            const next = enabled
              ? await enableHistory(OWNER, [], new Map())
              : await resetHistory(OWNER, false);
            assert.ok(next);
            setLease(next);
            setPersist(enabled);
            return true;
          },
          clearHistory: async () => {
            const next = await resetHistory(OWNER);
            assert.ok(next);
            setLease(next);
            return true;
          },
          clearMessages: async (cleanup) => {
            cleanups.push(cleanup);
            await pendingCleanup;
            if (failCleanup) {
              setStorageFailed(true);
              return false;
            }
            const next = await clearHistoryThrough(OWNER, cleanup);
            assert.ok(next);
            setLease(next);
            setStorageFailed(false);
            return true;
          },
        }}
        notifications={{ status: 'off', busy: false, toggle: async () => {} }}
        appearance={null}
        preferences={emptyChatWorkspace().preferences}
        onPreferenceChange={() => {}}
      />
    </NextIntlClientProvider>
  );
}

async function until(check: () => boolean) {
  for (let attempt = 0; attempt < 100 && !check(); attempt++) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
    });
  }
  assert.ok(check(), 'Chat data management did not settle');
}
function button(text: string) {
  const result = [...document.querySelectorAll<HTMLButtonElement>('button')].find(
    (element) => element.textContent === text,
  );
  assert.ok(result, `Missing button: ${text}`);
  return result;
}
async function openDataManager() {
  await act(async () => {
    document.querySelector('summary')?.click();
  });
  await until(() => document.body.textContent?.includes('4 saved messages') === true);
}
async function select(index: number, value: string) {
  await act(async () => {
    const field = document.querySelectorAll<HTMLSelectElement>('select')[index];
    field.value = value;
    field.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

beforeEach(async () => {
  browser = createBrowserEnvironment();
  await deleteChatHistoryDatabase(() => assert.fail('Blocked test database'));
  initial = await syncHistoryAccount(OWNER);
  await setStaffHistoryPermission(OWNER, true);
  const old = Date.now() - 100 * 86_400_000;
  for (const record of [
    message({ id: 'public-old', createdAt: old }),
    message({
      id: 'private-old',
      channel: 'private',
      targetUuid: OWNER,
      createdAt: old,
      order: order(2),
    }),
    message({ id: 'staff-old', channel: 'staff', createdAt: old, order: order(3) }),
    message({ id: 'public-new', order: order(4) }),
  ])
    await saveHistory(initial, record);
  await saveChatWorkspace(initial, {
    type: 'draft',
    key: 'public',
    text: 'Keep draft',
    at: Date.now(),
  });
  await saveChatWorkspace(initial, {
    type: 'open',
    destination: { channel: 'private', targetUuid: PEER, name: 'Alex' },
    at: Date.now(),
  });
  await saveChatWorkspace(initial, { type: 'preferences', value: { density: 'compact' } });
  cleanups = [];
  failCleanup = false;
  available = true;
  pendingCleanup = null;
  persistenceChanges = [];
  await act(async () => browser.root.render(<Harness />));
});
afterEach(async () => {
  await browser.close();
  await deleteChatHistoryDatabase(() => assert.fail('Leaked test database'));
});

test('settings preview type and date filters, focus cancellation, and clear only the confirmed messages', async () => {
  await openDataManager();
  assert.ok(document.body.textContent?.includes('3 matches'));
  const originalField = document.querySelector('select');
  await select(0, 'private');
  assert.equal(document.querySelector('select'), originalField);
  await until(() => document.body.textContent?.includes('1 match') === true);
  await act(async () => {
    button('Clear…').focus();
    button('Clear…').click();
  });
  assert.equal(document.activeElement, button('Cancel'));
  assert.match(document.querySelector('.chat-settings-confirm')?.textContent ?? '', /private/i);
  await act(async () => button('Cancel').click());
  assert.equal(cleanups.length, 0);
  assert.equal((await loadHistory(initial)).messages.length, 4);
  await act(async () => button('Clear…').click());
  await act(async () => button('Clear Messages').click());
  await until(() => document.body.textContent?.includes('Local chat data cleared.') === true);
  await until(() => document.body.textContent?.includes('3 saved messages') === true);
  assert.equal(document.activeElement, document.querySelector('summary'));
  assert.equal(cleanups[0].channel, 'private');
  assert.ok(Date.now() - cleanups[0].through >= 90 * 86_400_000);
  assert.deepEqual(
    (await loadHistory(active)).messages.map((record) => record.id),
    ['public-old', 'staff-old', 'public-new'],
  );
  assert.equal((await loadChatWorkspace(active))?.drafts.public.text, 'Keep draft');
  assert.ok((await loadChatWorkspace(active))?.threads[`private:${PEER}`]);
});

test('clearing all history removes messages, drafts, and conversations while keeping saving and preferences', async () => {
  await openDataManager();
  await select(0, 'private');
  await until(() => document.body.textContent?.includes('1 match') === true);
  await act(async () => button('Clear All History…').click());
  const confirmation = document.querySelector('.chat-settings-confirm');
  assert.match(confirmation?.textContent ?? '', /messages, drafts, and conversations/);
  assert.equal(document.activeElement, button('Cancel'));
  await act(async () => button('Cancel').click());
  assert.equal((await loadHistory(active)).messages.length, 4);
  assert.equal((await loadChatWorkspace(active))?.drafts.public.text, 'Keep draft');
  await act(async () => button('Clear All History…').click());
  await act(async () => button('Clear All History').click());
  await until(
    () =>
      document.querySelector('dialog') === null &&
      document.body.textContent?.includes('No messages are saved in this browser.') === true,
  );
  assert.deepEqual((await loadHistory(active)).messages, []);
  const workspace = await loadChatWorkspace(active);
  assert.deepEqual(workspace?.drafts, {});
  assert.deepEqual(workspace?.threads, {});
  assert.equal(workspace?.preferences.density, 'compact');
  assert.equal(active.persist, true);
  assert.deepEqual(persistenceChanges, []);
  assert.equal(document.activeElement, document.querySelector('summary'));
});

test('turning off saving requires its own confirmation, preserves data on cancel, and can be enabled again', async () => {
  const control = document.querySelector<HTMLInputElement>(
    'input[role="switch"][aria-label="Save local history"]',
  );
  assert.ok(control);
  await act(async () => {
    control.focus();
    control.click();
  });
  assert.ok(document.querySelector('dialog'));
  assert.ok(button('Turn Off & Clear'));
  assert.equal(control.checked, true);
  assert.equal(document.activeElement, button('Cancel'));
  await act(async () => button('Cancel').click());
  assert.equal(document.activeElement, control);
  assert.deepEqual(persistenceChanges, []);
  assert.equal((await loadHistory(active)).messages.length, 4);
  await act(async () => control.click());
  await act(async () => button('Turn Off & Clear').click());
  await until(() => document.querySelector('dialog') === null && !control.checked);
  assert.deepEqual(persistenceChanges, [false]);
  assert.equal(active.persist, false);
  assert.deepEqual((await loadHistory(active)).messages, []);
  const workspace = await loadChatWorkspace(active);
  assert.deepEqual(workspace?.drafts, {});
  assert.deepEqual(workspace?.threads, {});
  assert.equal(workspace?.preferences.density, 'compact');
  assert.equal(document.activeElement, control);
  await act(async () => control.click());
  await until(() => control.checked);
  assert.equal(document.querySelector('dialog'), null);
  assert.deepEqual(persistenceChanges, [false, true]);
  assert.equal(active.persist, true);
});

test('failed cleanup preserves records and confirmation for retry, while all-time cleanup remains scoped', async () => {
  await openDataManager();
  await select(0, 'public');
  await select(1, '0');
  await until(() => document.body.textContent?.includes('2 matches') === true);
  await act(async () => button('Clear…').click());
  failCleanup = true;
  await act(async () => button('Clear Messages').click());
  assert.ok(document.querySelector('.chat-settings-confirm'));
  assert.ok(document.querySelector('[role="alert"]'));
  await until(() => document.body.textContent?.includes('4 saved messages') === true);
  assert.equal((await loadHistory(initial)).messages.length, 4);
  failCleanup = false;
  await act(async () => button('Clear Messages').click());
  await until(
    () =>
      document.querySelector('.chat-settings-confirm') === null &&
      document.body.textContent?.includes('2 saved messages') === true,
  );
  assert.deepEqual(
    (await loadHistory(active)).messages.map((record) => record.id),
    ['private-old', 'staff-old'],
  );
});

test('data management starts collapsed and statistics failures offer an inline retry', async () => {
  assert.equal(document.querySelectorAll('select').length, 0);
  assert.equal(document.querySelector('details')?.open, false);
  const original = IDBIndex.prototype.count;
  let fail = true;
  IDBIndex.prototype.count = function (query) {
    if (fail) throw new Error('Statistics unavailable');
    return original.call(this, query);
  };
  try {
    await act(async () => document.querySelector('summary')?.click());
    await until(() => document.body.textContent?.includes('Statistics are unavailable.') === true);
    assert.equal(document.body.textContent?.includes('Counting local records'), false);
    assert.equal(cleanups.length, 0);
    fail = false;
    await act(async () => button('Retry').click());
    await until(() => document.body.textContent?.includes('4 saved messages') === true);
    assert.equal(document.querySelectorAll('select').length, 2);
  } finally {
    IDBIndex.prototype.count = original;
  }
});

test('a permission change cannot broaden a confirmed cleanup and Escape cancels only confirmation', async () => {
  await openDataManager();
  await select(0, 'staff');
  await until(() => document.body.textContent?.includes('1 match') === true);
  await act(async () => button('Clear…').click());
  assert.ok(document.querySelector('dialog[aria-describedby]'));
  await act(async () => {
    changeStaff(false);
  });
  assert.match(document.querySelector('.chat-settings-confirm')?.textContent ?? '', /staff/i);
  await act(async () => button('Clear Messages').click());
  await until(() => document.querySelector('dialog') === null && cleanups.length === 1);
  assert.equal(cleanups[0].channel, 'staff');
  await until(() => document.body.textContent?.includes('3 saved messages') === true);
  assert.equal(
    (await loadHistory(active)).messages.filter((record) => record.channel === 'public').length,
    2,
  );
  await act(async () => button('Clear…').click());
  await act(async () =>
    Reflect.apply(document.dispatchEvent, document, [
      new browser.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    ]),
  );
  assert.equal(document.querySelector('dialog'), null);
  assert.equal(document.querySelector('details')?.open, true);
  assert.equal(cleanups.length, 1);
});

test('cleanup cannot be submitted twice or dismissed while its write is pending', async () => {
  await openDataManager();
  let release = () => {};
  pendingCleanup = new Promise<void>((resolve) => {
    release = resolve;
  });
  await act(async () => button('Clear…').click());
  try {
    await act(async () => button('Clear Messages').click());
    assert.equal(button('Clearing…').disabled, true);
    assert.equal(button('Cancel').disabled, true);
    await act(async () => {
      button('Clearing…').click();
      Reflect.apply(document.dispatchEvent, document, [
        new browser.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      ]);
    });
    assert.ok(document.querySelector('dialog'));
    assert.equal(cleanups.length, 1);
  } finally {
    await act(async () => release());
  }
  await until(
    () =>
      document.querySelector('dialog') === null &&
      document.body.textContent?.includes('1 saved message') === true,
  );
});

test('unavailable storage explains disabled controls without a perpetual loading state', async () => {
  available = false;
  await act(async () => browser.root.render(<Harness />));
  await act(async () => document.querySelector('summary')?.click());
  await until(
    () =>
      document
        .querySelector('.chat-data-management__content')
        ?.textContent?.includes('Local storage is unavailable') === true,
  );
  assert.equal(document.body.textContent?.includes('Counting local records'), false);
  assert.equal(document.querySelectorAll('select').length, 0);
  assert.equal(button('Clear All History…').disabled, true);
});

test('empty selections explain the disabled action and clearing all messages leaves an explicit empty state', async () => {
  await openDataManager();
  await select(1, '365');
  await until(() => document.body.textContent?.includes('No matching messages.') === true);
  assert.equal(button('Clear…').disabled, true);
  await select(1, '0');
  await until(() => document.body.textContent?.includes('4 matches') === true);
  await act(async () => button('Clear…').click());
  await act(async () => button('Clear Messages').click());
  await until(
    () => document.body.textContent?.includes('No messages are saved in this browser.') === true,
  );
  assert.equal(document.querySelectorAll('select').length, 0);
  assert.equal(document.activeElement, document.querySelector('summary'));
  assert.equal((await loadChatWorkspace(active))?.drafts.public.text, 'Keep draft');
});
