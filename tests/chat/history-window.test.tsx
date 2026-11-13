import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { act } from 'react';
import type { HistoryLease } from '@/modules/chat/lib/chat-history';
import {
  loadHistory,
  readHistoryWindow,
  saveHistorySync,
  setStaffHistoryPermission,
  syncHistoryAccount,
} from '@/modules/chat/lib/chat-history';
import { deleteChatHistoryDatabase } from '@/modules/chat/lib/chat-history-database';
import type { ChatMessage } from '@/modules/chat/model/chat-protocol';
import { useChatHistoryWindow } from '@/modules/chat/model/use-chat-history-window';
import { createBrowserEnvironment } from '../support/browser-environment';
import { message, OWNER, order } from './fixtures';

let browser: ReturnType<typeof createBrowserEnvironment>;
let lease: HistoryLease;
let current: ReturnType<typeof useChatHistoryWindow>;
const read = (conversation: string, before?: string, target?: string, after?: string) =>
  readHistoryWindow(lease, conversation, before, target, after);
function Harness({
  conversation = 'public',
  target,
  allowed = true,
  recent = [],
}: {
  conversation?: string;
  target?: string;
  allowed?: boolean;
  recent?: ChatMessage[];
}) {
  current = useChatHistoryWindow({
    owner: OWNER,
    conversation,
    epoch: lease.epoch,
    recent,
    allowed,
    target,
    read,
  });
  return null;
}
async function until(check: () => boolean) {
  for (let i = 0; i < 100 && !check(); i++)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 2));
    });
  assert.ok(check());
}
beforeEach(async () => {
  browser = createBrowserEnvironment();
  lease = await syncHistoryAccount(OWNER);
  const records = Array.from({ length: 1205 }, (_, index) =>
    message({ id: `record-${index}`, order: order(index + 1) }),
  );
  await saveHistorySync(
    lease,
    'public',
    records,
    undefined,
    { checkpoint: 'a'.repeat(91) },
    new Set(records.map((record) => record.id)),
  );
});
afterEach(async () => {
  await browser.close();
  await deleteChatHistoryDatabase(() => assert.fail('Leaked connection'));
});
test('conversation windows page into older history, jump beyond the initial cache, and return to latest', async () => {
  await act(async () => browser.root.render(<Harness />));
  await until(() => !current.loading && current.messages.length === 256);
  assert.equal(current.messages[0].id, 'record-949');
  await act(async () => current.earlier());
  await until(() => !current.loading && current.older);
  assert.equal(current.messages.length, 512);
  assert.equal(current.messages[0].id, 'record-693');
  await act(async () => browser.root.render(<Harness target="record-0" />));
  await until(
    () => !current.loading && !current.awaitingTarget && current.messages[0]?.id === 'record-0',
  );
  assert.equal(
    (await loadHistory(lease)).messages.some((record) => record.id === 'record-0'),
    false,
  );
  await act(async () => browser.root.render(<Harness />));
  await act(async () => current.latest());
  await until(() => !current.loading && !current.older);
  assert.equal(current.messages.at(-1)?.id, 'record-1204');
});
test('switching conversations and revoking staff never displays a retained window from another scope', async () => {
  await setStaffHistoryPermission(OWNER, true);
  await saveHistorySync(
    lease,
    'staff',
    [message({ id: 'secret', channel: 'staff', order: order(2000) })],
    undefined,
    { checkpoint: 'b'.repeat(91) },
    new Set(['secret']),
  );
  await act(async () => browser.root.render(<Harness conversation="staff" target="secret" />));
  await until(() => current.messages.some((record) => record.id === 'secret'));
  await act(async () => browser.root.render(<Harness conversation="public" />));
  assert.ok(current.messages.every((record) => record.channel === 'public'));
  await until(() => !current.loading);
  await act(async () => browser.root.render(<Harness conversation="staff" allowed={false} />));
  assert.deepEqual(current.messages, []);
});

test('paging from a recent memory window has no gaps and can move forward without skipping the middle', async () => {
  const snapshot = await loadHistory(lease);
  await act(async () => browser.root.render(<Harness recent={snapshot.messages} />));
  await until(() => !current.loading && current.messages.length === 512);
  const contiguous = () => {
    const indexes = current.messages.map((record) => Number(record.id.split('-')[1]));
    assert.ok(indexes.every((value, index) => index === 0 || value === indexes[index - 1] + 1));
  };
  assert.equal(current.messages[0].id, 'record-693');
  await act(async () => current.earlier());
  await until(() => !current.loading && current.messages[0]?.id === 'record-437');
  contiguous();
  assert.equal(current.hasNewer, true);
  await act(async () => current.earlier());
  await until(() => !current.loading && current.messages[0]?.id === 'record-181');
  contiguous();
  await act(async () => current.later());
  await until(() => !current.loading && current.messages[0]?.id === 'record-437');
  contiguous();
  await act(async () => current.later());
  await until(() => !current.loading && current.messages.at(-1)?.id === 'record-1204');
  contiguous();
  assert.equal(current.hasNewer, false);
});
