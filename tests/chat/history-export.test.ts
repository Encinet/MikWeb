import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import {
  clearHistoryThrough,
  loadChatWorkspace,
  loadHistory,
  readUnreadSummary,
  saveChatWorkspace,
  saveHistory,
  saveHistorySync,
  setStaffHistoryPermission,
  syncHistoryAccount,
} from '@/modules/chat/lib/history/chat-history';
import { storedMessage } from '@/modules/chat/lib/history/chat-history-codec';
import {
  deleteChatHistoryDatabase,
  openChatHistoryDatabase,
} from '@/modules/chat/lib/history/chat-history-database';
import type { HistoryTextLabels } from '@/modules/chat/lib/history/chat-history-export';
import {
  exportChatHistory,
  historyMessageText,
} from '@/modules/chat/lib/history/chat-history-export';
import type { ChatMessage } from '@/modules/chat/model/chat-protocol';
import { createBrowserEnvironment } from '../support/browser-environment';
import { message, OTHER, OWNER, order, PEER, player } from './fixtures';

const labels: HistoryTextLabels = {
  channels: { public: 'Public', private: 'Private', staff: 'Staff' },
  sources: { game: 'Game', web: 'Web' },
  server: 'Server',
  you: 'You',
  date: (time) => new Date(time).toISOString(),
  activity: (content) => `${content.values.name} ${content.template}`,
};
const options = () => ({
  staff: true,
  selection: { channel: 'all' as const, through: Number.MAX_SAFE_INTEGER },
  format: 'json' as const,
  signal: new AbortController().signal,
  text: { header: 'Chat export', labels },
});
afterEach(async () => {
  await deleteChatHistoryDatabase(() => assert.fail('An export test leaked a connection'));
});

test('JSON exports a full archive beyond the memory window, including identical orders across page boundaries', async () => {
  const lease = await syncHistoryAccount(OWNER);
  await setStaffHistoryPermission(OWNER, true);
  const records = Array.from({ length: 1200 }, (_, i) =>
    message({
      id: `entry-${i.toString().padStart(4, '0')}`,
      order: order(Math.floor(i / 300) + 1),
      createdAt: i,
      content: [{ text: `中文记录 🌳 ${i}` }],
    }),
  );
  const db = await openChatHistoryDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('messages', 'readwrite');
    for (const record of records) tx.objectStore('messages').put(storedMessage(OWNER, record));
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error);
  });
  const progress: number[] = [];
  const result = await exportChatHistory({
    ...options(),
    lease,
    onProgress: (count) => progress.push(count),
  });
  const data = JSON.parse(await result.blob.text());
  assert.equal(result.count, records.length);
  assert.equal(data.count, records.length);
  assert.deepEqual(data.messages, records);
  assert.equal(data.format, 'mik-chat-history');
  assert.equal(data.version, 1);
  assert.equal(data.owner, OWNER);
  assert.deepEqual(data.selection, { channel: 'all', through: null });
  assert.match(result.filename, /^mik-chat-[\dTZ-]+\.json$/);
  assert.equal(result.blob.type, 'application/json;charset=utf-8');
  assert.ok(progress.length > 1);
  assert.equal(progress.at(-1), 1200);
});

test('selected-player exports use the same exact date, channel, and both-direction private scope as cleanup', async () => {
  const lease = await syncHistoryAccount(OWNER);
  await setStaffHistoryPermission(OWNER, true);
  const records = [
    message({ id: 'incoming', createdAt: 100, channel: 'private', targetUuid: OWNER }),
    message({
      id: 'outgoing',
      createdAt: 100,
      order: order(2),
      channel: 'private',
      targetUuid: PEER,
      targetName: 'Alex',
      sender: player(OWNER, 'Me'),
    }),
    message({
      id: 'recent',
      createdAt: 101,
      order: order(3),
      channel: 'private',
      targetUuid: OWNER,
    }),
    message({
      id: 'other',
      createdAt: 100,
      order: order(4),
      channel: 'private',
      targetUuid: OWNER,
      sender: player(OTHER, 'Steve'),
    }),
    message({ id: 'public', createdAt: 100, order: order(5) }),
  ];
  for (const record of records) await saveHistory(lease, record);
  const result = await exportChatHistory({
    ...options(),
    lease,
    selection: { channel: 'private', through: 100, players: [PEER] },
  });
  assert.deepEqual(JSON.parse(await result.blob.text()).messages, records.slice(0, 2));
});

test('exports leave messages, unread markers, drafts, preferences, and sync checkpoints unchanged', async () => {
  const browser = createBrowserEnvironment();
  try {
    const lease = await syncHistoryAccount(OWNER);
    await setStaffHistoryPermission(OWNER, true);
    await saveHistory(lease, message());
    await saveChatWorkspace(lease, {
      type: 'draft',
      key: 'public',
      text: 'Keep draft',
      at: Date.now(),
    });
    await saveHistorySync(
      lease,
      'public',
      [],
      undefined,
      { checkpoint: 'A'.repeat(91) },
      new Set(),
    );
    const before = {
      snapshot: await loadHistory(lease),
      workspace: await loadChatWorkspace(lease),
      unread: await readUnreadSummary(lease, 'public'),
    };
    await exportChatHistory({ ...options(), lease });
    assert.deepEqual(
      {
        snapshot: await loadHistory(lease),
        workspace: await loadChatWorkspace(lease),
        unread: await readUnreadSummary(lease, 'public'),
      },
      before,
    );
  } finally {
    await browser.close();
  }
});

test('plain text keeps Unicode, source, private direction, links, multiline text, and translated activity', async () => {
  const lease = await syncHistoryAccount(OWNER);
  const record = message({
    createdAt: 0,
    channel: 'private',
    targetUuid: OWNER,
    source: { kind: 'web' },
    content: [
      { text: '中文 🌳\nnext' },
      { text: ' link', href: 'https://example.com/' },
      { text: ' @Alex', mention: true, style: { bold: true } },
    ],
  });
  await saveHistory(lease, record);
  const result = await exportChatHistory({ ...options(), lease, staff: false, format: 'txt' });
  const output = await result.blob.text();
  assert.match(output, /Chat export/);
  assert.match(
    output,
    /1970-01-01T00:00:00.000Z.*\[Private\].*\[Web\] Alex → You: 中文 🌳\n {2}next link \(https:\/\/example.com\/\) @Alex/,
  );
  assert.equal(result.blob.type, 'text/plain;charset=utf-8');
  const activity: ChatMessage = {
    id: 'activity',
    kind: 'server',
    channel: 'public',
    content: { template: 'gameJoined', values: { name: 'Alex' } },
    subject: { playerUuid: PEER, name: 'Alex' },
    createdAt: 1,
    order: order(2),
    countsAsUnread: false,
  };
  assert.match(historyMessageText(activity, OWNER, labels), /\[Public\] Server: Alex gameJoined/);
});

for (const change of ['abort', 'account', 'cleanup', 'staff']) {
  test(`an export interrupted by ${change} yields no partial file`, async () => {
    const browser = createBrowserEnvironment();
    try {
      const lease = await syncHistoryAccount(OWNER);
      await setStaffHistoryPermission(OWNER, true);
      const records = Array.from({ length: 300 }, (_, i) =>
        message({ id: `record-${i}`, order: order(i + 1) }),
      );
      const db = await openChatHistoryDatabase();
      await new Promise<void>((resolve) => {
        const tx = db.transaction('messages', 'readwrite');
        for (const record of records) tx.objectStore('messages').put(storedMessage(OWNER, record));
        tx.oncomplete = () => resolve();
      });
      const controller = new AbortController();
      let mutation: Promise<unknown> | undefined;
      const exporting = exportChatHistory({
        ...options(),
        lease,
        signal: controller.signal,
        onProgress: () => {
          if (change === 'abort') controller.abort();
          else if (!mutation)
            mutation =
              change === 'account'
                ? syncHistoryAccount(OTHER)
                : change === 'staff'
                  ? setStaffHistoryPermission(OWNER, false)
                  : clearHistoryThrough(OWNER, { channel: 'all', through: Date.now() });
        },
      });
      await assert.rejects(exporting);
      await mutation;
    } finally {
      await browser.close();
    }
  });
}

test('empty selections and invalid records fail instead of producing a misleading complete archive', async () => {
  const lease = await syncHistoryAccount(OWNER);
  await assert.rejects(
    exportChatHistory({ ...options(), lease, staff: false }),
    /history_export_empty/,
  );
  await saveHistory(lease, message());
  await assert.rejects(
    exportChatHistory({
      ...options(),
      lease,
      staff: false,
      selection: { channel: 'all', through: 0, players: [] },
    }),
    /invalid_history_selection/,
  );
  const db = await openChatHistoryDatabase();
  await new Promise<void>((resolve) => {
    const tx = db.transaction('messages', 'readwrite');
    const record = storedMessage(OWNER, message());
    tx.objectStore('messages').put({ ...record, data: { ...record.data, v: [] } });
    tx.oncomplete = () => resolve();
  });
  await assert.rejects(
    exportChatHistory({ ...options(), lease, staff: false }),
    /history_export_invalid/,
  );
  await new Promise<void>((resolve) => {
    const tx = db.transaction('messages', 'readwrite');
    const record = storedMessage(OWNER, message());
    tx.objectStore('messages').put({ ...record, data: { ...record.data, o: undefined } });
    tx.oncomplete = () => resolve();
  });
  await assert.rejects(
    exportChatHistory({ ...options(), lease, staff: false }),
    /history_export_invalid/,
  );
});

test('live arrivals cannot extend an export beyond its initial last record, and UI filter mutation cannot broaden it', async () => {
  const lease = await syncHistoryAccount(OWNER);
  const db = await openChatHistoryDatabase();
  const records = Array.from({ length: 300 }, (_, i) =>
    message({ id: `record-${i}`, order: order(i + 1) }),
  );
  await new Promise<void>((resolve) => {
    const tx = db.transaction('messages', 'readwrite');
    for (const record of records) tx.objectStore('messages').put(storedMessage(OWNER, record));
    tx.oncomplete = () => resolve();
  });
  const selection = { channel: 'all' as const, through: Number.MAX_SAFE_INTEGER, players: [PEER] };
  let mutation: Promise<unknown> | undefined;
  const result = await exportChatHistory({
    ...options(),
    lease,
    staff: false,
    selection,
    onProgress: () => {
      if (mutation) return;
      selection.players.push(OTHER);
      mutation = Promise.all([
        saveHistory(lease, message({ id: 'newer', order: order(301) })),
        saveHistory(lease, message({ id: 'zz-duplicate-last', order: order(300) })),
        saveHistory(
          lease,
          message({ id: 'other', order: order(299), sender: player(OTHER, 'Steve') }),
        ),
      ]);
    },
  });
  await mutation;
  assert.equal(result.count, 300);
  assert.deepEqual(JSON.parse(await result.blob.text()).messages, records);
});
