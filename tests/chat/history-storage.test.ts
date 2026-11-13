import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import {
  clearHistoryThrough,
  historyAllowsMessage,
  loadChatWorkspace,
  loadHistory,
  readHistorySummary,
  saveChatWorkspace,
  saveHistory,
  saveHistorySync,
  setStaffHistoryPermission,
  syncHistoryAccount,
} from '@/modules/chat/lib/history/chat-history';
import { encodeMessageData } from '@/modules/chat/lib/history/chat-history-codec';
import { deleteChatHistoryDatabase } from '@/modules/chat/lib/history/chat-history-database';
import {
  readHistoryStorageReport,
  selectHistoryUsage,
} from '@/modules/chat/lib/history/chat-history-storage';
import type { ChatMessage } from '@/modules/chat/model/chat-protocol';
import { createBrowserEnvironment } from '../support/browser-environment';
import { message, OTHER, OWNER, order, PEER, player } from './fixtures';

let browser: ReturnType<typeof createBrowserEnvironment>;
beforeEach(() => {
  browser = createBrowserEnvironment();
});
afterEach(async () => {
  await browser.close();
  await deleteChatHistoryDatabase(() => assert.fail('Leaked database'));
});

test('storage snapshots partition compact UTF-8 message bytes by channel, player, and exact age boundaries', async () => {
  const lease = await syncHistoryAccount(OWNER);
  await setStaffHistoryPermission(OWNER, true);
  const now = Date.now();
  const records: ChatMessage[] = [
    message({
      id: 'boundary',
      createdAt: now - 90 * 86_400_000,
      content: [{ text: '中文记录🌳' }],
    }),
    message({ id: 'recent', createdAt: now - 90 * 86_400_000 + 1, order: order(2) }),
    message({
      id: 'outgoing',
      channel: 'private',
      targetUuid: PEER,
      targetName: 'Alex',
      sender: player(OWNER, 'Me'),
      createdAt: now,
      order: order(3),
    }),
    message({
      id: 'other',
      sender: player(OTHER, 'Steve'),
      channel: 'staff',
      createdAt: now - 400 * 86_400_000,
      order: order(4),
    }),
    {
      id: 'activity',
      kind: 'server',
      channel: 'public',
      content: { template: 'gameJoined', values: { name: 'Alex' } },
      subject: { playerUuid: PEER, name: 'Alex' },
      createdAt: now - 40 * 86_400_000,
      order: order(5),
      countsAsUnread: false,
    },
    {
      id: 'system',
      kind: 'server',
      channel: 'public',
      content: [{ text: 'Server notice' }],
      createdAt: now,
      order: order(6),
      countsAsUnread: false,
    },
    message({ id: 'future', createdAt: now + 60_000, order: order(7) }),
  ];
  for (const record of records) await saveHistory(lease, record);
  const report = await readHistoryStorageReport(lease, now);
  assert.ok(report);
  const bytes = (record: ChatMessage) =>
    new TextEncoder().encode(JSON.stringify(encodeMessageData(record))).byteLength;
  assert.equal(report.count, records.length);
  assert.equal(
    report.bytes,
    records.reduce((total, record) => total + bytes(record), 0),
  );
  assert.equal(
    Object.values(report.channels).reduce((total, value) => total + value.bytes, 0),
    report.bytes,
  );
  assert.equal(report.players.find((value) => value.uuid === PEER)?.count, 5);
  assert.equal(
    report.players.some((value) => value.uuid === OWNER),
    false,
  );
  assert.deepEqual(selectHistoryUsage(report, 'all', 90, [PEER]), {
    count: 1,
    bytes: bytes(records[0]),
  });
  assert.equal(selectHistoryUsage(report, 'all', 30, [PEER]).count, 3);
  assert.equal(selectHistoryUsage(report, 'private', 0, [PEER]).count, 1);
  assert.equal(selectHistoryUsage(report, 'all', 0, []).count, 0);
  assert.equal(selectHistoryUsage(report, 'all', 0).count, 6);
  assert.equal(selectHistoryUsage(report, 'all', 365).count, 1);
  assert.equal(report.oldestAt, records[3].createdAt);
});

test('player cleanup removes both private directions and player activity while preserving other players, drafts, and channel scope', async () => {
  const lease = await syncHistoryAccount(OWNER);
  const cutoff = Date.now() - 60_000;
  const records = [
    message({ id: 'alex-public', createdAt: cutoff }),
    message({
      id: 'alex-incoming',
      channel: 'private',
      targetUuid: OWNER,
      createdAt: cutoff,
      order: order(2),
    }),
    message({
      id: 'alex-outgoing',
      sender: player(OWNER, 'Me'),
      channel: 'private',
      targetUuid: PEER,
      targetName: 'Alex',
      createdAt: cutoff,
      order: order(3),
    }),
    message({
      id: 'steve',
      sender: player(OTHER, 'Steve'),
      channel: 'private',
      targetUuid: OWNER,
      createdAt: cutoff,
      order: order(4),
    }),
    message({ id: 'alex-new', createdAt: cutoff + 1, order: order(5) }),
  ];
  for (const record of records) await saveHistory(lease, record);
  await saveChatWorkspace(lease, {
    type: 'draft',
    key: `private:${PEER}`,
    text: 'Keep draft',
    at: Date.now(),
  });
  const cleanup = { channel: 'private' as const, through: cutoff, players: [PEER] };
  assert.equal((await readHistorySummary(lease, cleanup))?.matching, 2);
  const next = await clearHistoryThrough(OWNER, cleanup);
  assert.ok(next);
  for (const record of records) {
    await saveHistory(lease, record);
    await saveHistory(next, record);
  }
  const position = { checkpoint: 'A'.repeat(91) };
  await saveHistorySync(
    next,
    'private',
    records.filter((record) => record.channel === 'private'),
    undefined,
    position,
    new Set(),
  );
  assert.deepEqual(
    (await loadHistory(next)).messages.map((record) => record.id),
    ['alex-public', 'steve', 'alex-new'],
  );
  assert.equal((await loadChatWorkspace(next))?.drafts[`private:${PEER}`]?.text, 'Keep draft');
  const allChannels = await clearHistoryThrough(OWNER, {
    channel: 'all',
    through: cutoff,
    players: [PEER],
  });
  assert.ok(allChannels);
  assert.equal(historyAllowsMessage(allChannels, records[0]), false);
  assert.equal(historyAllowsMessage(allChannels, records[3]), true);
  assert.equal(historyAllowsMessage(allChannels, records[4]), true);
  assert.equal(await readHistoryStorageReport(lease, Date.now()), null);
  await assert.rejects(
    clearHistoryThrough(OWNER, { channel: 'all', through: cutoff, players: [] }),
  );
});

test('storage reports respect account ownership, staff permission, and cancellation', async () => {
  const lease = await syncHistoryAccount(OWNER);
  await setStaffHistoryPermission(OWNER, true);
  await saveHistory(lease, message({ channel: 'staff' }));
  await setStaffHistoryPermission(OWNER, false);
  assert.equal((await readHistoryStorageReport(lease, Date.now()))?.count, 0);
  const controller = new AbortController();
  controller.abort();
  assert.equal(await readHistoryStorageReport(lease, Date.now(), controller.signal), null);
  await syncHistoryAccount(OTHER);
  assert.equal(await readHistoryStorageReport(lease, Date.now()), null);
});

test('clearing a player also removes their activity and restores the latest surviving channel preview', async () => {
  const lease = await syncHistoryAccount(OWNER);
  const now = Date.now() - 1;
  await saveHistory(
    lease,
    message({ id: 'survivor', sender: player(OTHER, 'Steve'), createdAt: now }),
  );
  await saveHistory(lease, message({ id: 'removed', createdAt: now, order: order(2) }));
  const activity: ChatMessage = {
    id: 'activity',
    kind: 'server',
    channel: 'public',
    subject: { playerUuid: PEER, name: 'Alex' },
    content: { template: 'gameLeft', values: { name: 'Alex' } },
    createdAt: now,
    order: order(3),
    countsAsUnread: false,
  };
  await saveHistory(lease, activity);
  const next = await clearHistoryThrough(OWNER, { channel: 'all', through: now, players: [PEER] });
  assert.ok(next);
  assert.equal(historyAllowsMessage(next, activity), false);
  const snapshot = await loadHistory(next);
  assert.deepEqual(
    snapshot.messages.map((record) => record.id),
    ['survivor'],
  );
  assert.equal(snapshot.latest.find((record) => record.channel === 'public')?.id, 'survivor');
});
