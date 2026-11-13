import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { NextIntlClientProvider } from 'next-intl';
import { act } from 'react';
import type { HistoryLease } from '@/modules/chat/lib/history/chat-history';
import {
  saveHistory,
  setStaffHistoryPermission,
  syncHistoryAccount,
} from '@/modules/chat/lib/history/chat-history';
import { deleteChatHistoryDatabase } from '@/modules/chat/lib/history/chat-history-database';
import { ChatHistorySettings } from '@/modules/chat/ui/settings/chat-history-settings';
import translations from '../../messages/en.json';
import { createBrowserEnvironment } from '../support/browser-environment';
import { message, OWNER, order, PEER, player } from './fixtures';

let browser: ReturnType<typeof createBrowserEnvironment>;
let lease: HistoryLease;
let files: Map<string, Blob>;
let downloads: { url: string; filename: string }[];
let revoked: string[];
let createURL: typeof URL.createObjectURL;
let revokeURL: typeof URL.revokeObjectURL;
let failFile: boolean;
function button(text: string) {
  const element = [...document.querySelectorAll<HTMLButtonElement>('button')].find(
    (button) => button.textContent === text,
  );
  assert.ok(element, `Missing ${text}`);
  return element;
}
async function until(check: () => boolean) {
  for (let i = 0; i < 100 && !check(); i++)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
    });
  assert.ok(check(), 'Export UI did not settle');
}
async function render(staff = true) {
  await act(async () =>
    browser.root.render(
      <NextIntlClientProvider locale="en" timeZone="UTC" messages={translations}>
        <ChatHistorySettings
          chat={{
            historyLease: lease,
            staff,
            persist: true,
            storageFailed: false,
            clearHistory: async () => assert.fail('Export must not clear records'),
            clearMessages: async () => assert.fail('Export must not clear messages'),
            setPersistence: async () => assert.fail('Export must not change persistence'),
          }}
        />
      </NextIntlClientProvider>,
    ),
  );
}
async function change(field: HTMLSelectElement | null, value: string) {
  assert.ok(field);
  await act(async () => {
    field.value = value;
    field.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
beforeEach(async () => {
  browser = createBrowserEnvironment();
  lease = await syncHistoryAccount(OWNER);
  await setStaffHistoryPermission(OWNER, true);
  const old = Date.now() - 100 * 86_400_000;
  for (const record of [
    message({ id: 'public-old', createdAt: old }),
    message({
      id: 'private-in',
      channel: 'private',
      targetUuid: OWNER,
      createdAt: old,
      order: order(2),
    }),
    message({
      id: 'private-out',
      channel: 'private',
      targetUuid: PEER,
      targetName: 'Alex',
      sender: player(OWNER, 'Me'),
      createdAt: old,
      order: order(3),
    }),
    message({ id: 'staff-old', channel: 'staff', createdAt: old, order: order(4) }),
    message({ id: 'public-new', order: order(5) }),
  ])
    await saveHistory(lease, record);
  files = new Map();
  downloads = [];
  revoked = [];
  failFile = false;
  createURL = URL.createObjectURL;
  revokeURL = URL.revokeObjectURL;
  URL.createObjectURL = (blob) => {
    if (failFile) throw new Error('file_unavailable');
    const url = `blob:test-${files.size}`;
    files.set(url, blob as Blob);
    return url;
  };
  URL.revokeObjectURL = (url) => {
    revoked.push(url);
  };
  browser.window.HTMLAnchorElement.prototype.click = function () {
    downloads.push({ url: this.href, filename: this.download });
  };
  await render();
  await until(() => !button('Export Records…').disabled);
});
afterEach(async () => {
  await browser.close();
  URL.createObjectURL = createURL;
  URL.revokeObjectURL = revokeURL;
  await deleteChatHistoryDatabase(() => assert.fail('Leaked export test database'));
});

test('export defaults to all messages, downloads canonical JSON, and releases the file on close', async () => {
  button('Export Records…').focus();
  await act(async () => button('Export Records…').click());
  assert.equal(
    document.querySelector<HTMLSelectElement>('.chat-history-export select')?.value,
    'all',
  );
  assert.match(document.querySelector('.chat-export-scope')?.textContent ?? '', /About 5 messages/);
  await act(async () => button('Export').click());
  await until(() => downloads.length === 1);
  const file = files.get(downloads[0].url);
  assert.ok(file);
  assert.equal(JSON.parse(await file.text()).messages.length, 5);
  assert.match(downloads[0].filename, /\.json$/);
  await act(async () => button('Download Again').click());
  assert.deepEqual(downloads[1], downloads[0]);
  await act(async () => button('Close').click());
  assert.deepEqual(revoked, [downloads[0].url]);
  assert.equal(document.querySelector('.chat-export-dialog'), null);
  assert.equal(document.activeElement, button('Export Records…'));
});

test('current filters export only the selected private peer and clear a ready file when the format changes', async () => {
  await change(document.querySelector('select[name="history-channel"]'), 'private');
  await act(async () =>
    document.querySelector<HTMLInputElement>('input[type="radio"][value="players"]')?.click(),
  );
  await act(async () =>
    document.querySelector<HTMLInputElement>('.chat-player-record input')?.click(),
  );
  await act(async () => button('Export Records…').click());
  await change(document.querySelector('.chat-history-export select'), 'filtered');
  await change(
    document.querySelectorAll<HTMLSelectElement>('.chat-history-export select')[1],
    'txt',
  );
  assert.match(
    document.querySelector('.chat-export-scope')?.textContent ?? '',
    /2 messages.*Private.*Alex/,
  );
  await act(async () => button('Export').click());
  await until(() => downloads.length === 1);
  const file = files.get(downloads[0].url);
  assert.ok(file);
  assert.equal(file.type, 'text/plain;charset=utf-8');
  const text = await file.text();
  assert.match(text, /Alex → you/);
  assert.match(text, /Me → Alex/);
  assert.doesNotMatch(text, /\[Public\]|\[Staff\]/);
  await change(
    document.querySelectorAll<HTMLSelectElement>('.chat-history-export select')[1],
    'json',
  );
  assert.deepEqual(revoked, [downloads[0].url]);
  assert.equal(button('Export').disabled, false);
});

test('cancelling a pending export produces no download, and a file-generation failure can be retried', async () => {
  await act(async () => button('Export Records…').click());
  await act(async () => {
    button('Export').click();
    button('Cancel').click();
  });
  assert.equal(document.querySelector('.chat-export-dialog'), null);
  assert.deepEqual(downloads, []);
  failFile = true;
  await act(async () => button('Export Records…').click());
  await act(async () => button('Export').click());
  await until(() => document.querySelector('.chat-history-export [role="alert"]') !== null);
  assert.equal(downloads.length, 0);
  failFile = false;
  await act(async () => button('Export').click());
  await until(() => downloads.length === 1);
});

test('a staff permission change dismisses the export and releases its prepared private file', async () => {
  await act(async () => button('Export Records…').click());
  await act(async () => button('Export').click());
  await until(() => downloads.length === 1);
  await setStaffHistoryPermission(OWNER, false);
  await render(false);
  assert.equal(document.querySelector('.chat-export-dialog'), null);
  assert.deepEqual(revoked, [downloads[0].url]);
});
