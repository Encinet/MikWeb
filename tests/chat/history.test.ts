import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import {
  enableHistory,
  loadChatWorkspace,
  resetHistory,
  saveChatWorkspace,
  setStaffHistoryPermission,
  syncHistoryAccount,
} from '@/modules/chat/lib/history/chat-history';
import {
  emptyChatWorkspace,
  updateChatWorkspace,
} from '@/modules/chat/model/workspace/chat-workspace';
import { OTHER, OWNER, PEER } from './fixtures';

const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
before(() => {
  Object.defineProperty(globalThis, 'window', { value: new EventTarget(), configurable: true });
});
after(() => {
  if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
  else Reflect.deleteProperty(globalThis, 'window');
});
beforeEach(async () => {
  await syncHistoryAccount(null);
});

test('parallel writes in different conversations preserve both drafts and preferences across reloads', async () => {
  const lease = await syncHistoryAccount(OWNER);
  await Promise.all([
    saveChatWorkspace(lease, { type: 'draft', key: 'public', text: 'Public', at: Date.now() }),
    saveChatWorkspace(lease, {
      type: 'draft',
      key: `private:${PEER}`,
      text: 'Private',
      at: Date.now(),
    }),
    saveChatWorkspace(lease, { type: 'preferences', value: { density: 'compact' } }),
  ]);
  const restored = await loadChatWorkspace(lease);
  assert.equal(restored?.drafts.public.text, 'Public');
  assert.equal(restored?.drafts[`private:${PEER}`].text, 'Private');
  assert.equal(restored?.preferences.density, 'compact');
});

test('clearing history deletes drafts and thread metadata; stale tab writes cannot resurrect them', async () => {
  const lease = await syncHistoryAccount(OWNER);
  await saveChatWorkspace(lease, { type: 'draft', key: 'public', text: 'Secret', at: Date.now() });
  await saveChatWorkspace(lease, {
    type: 'open',
    destination: { channel: 'private', targetUuid: PEER, name: 'Alex' },
    at: Date.now(),
  });
  await saveChatWorkspace(lease, { type: 'preferences', value: { membersVisible: false } });
  const next = await resetHistory(OWNER);
  assert.ok(next);
  await saveChatWorkspace(lease, { type: 'draft', key: 'public', text: 'Stale', at: Date.now() });
  assert.equal(await loadChatWorkspace(lease), null);
  const restored = await loadChatWorkspace(next);
  assert.deepEqual(restored?.drafts, {});
  assert.deepEqual(restored?.threads, {});
  assert.equal(restored?.preferences.membersVisible, false);
});

test('disabled persistence stores only UI preferences; re-enabling explicitly saves current in-memory drafts', async () => {
  await syncHistoryAccount(OWNER);
  const disabled = await resetHistory(OWNER, false);
  assert.ok(disabled);
  await saveChatWorkspace(disabled, {
    type: 'draft',
    key: 'public',
    text: 'Do not store',
    at: Date.now(),
  });
  await saveChatWorkspace(disabled, { type: 'preferences', value: { showActivity: false } });
  assert.deepEqual((await loadChatWorkspace(disabled))?.drafts, {});
  const current = updateChatWorkspace(emptyChatWorkspace(), {
    type: 'draft',
    key: 'public',
    text: 'Save now',
    at: Date.now(),
  });
  const enabled = await enableHistory(OWNER, [], new Map(), current);
  assert.ok(enabled);
  assert.equal((await loadChatWorkspace(enabled))?.drafts.public.text, 'Save now');
});

test('switching accounts removes previous drafts and blocks old account writes', async () => {
  const first = await syncHistoryAccount(OWNER);
  await saveChatWorkspace(first, {
    type: 'draft',
    key: 'public',
    text: 'First account',
    at: Date.now(),
  });
  const second = await syncHistoryAccount(OTHER);
  await saveChatWorkspace(first, {
    type: 'draft',
    key: 'public',
    text: 'Stale first account',
    at: Date.now(),
  });
  assert.equal(await loadChatWorkspace(first), null);
  assert.deepEqual((await loadChatWorkspace(second))?.drafts, {});
});

test('staff permission loss removes staff drafts and blocks a stale authorized tab from saving them', async () => {
  const lease = await syncHistoryAccount(OWNER);
  await setStaffHistoryPermission(OWNER, true);
  await saveChatWorkspace(lease, {
    type: 'draft',
    key: 'staff',
    text: 'Staff only',
    at: Date.now(),
  });
  assert.equal((await loadChatWorkspace(lease))?.drafts.staff.text, 'Staff only');
  await setStaffHistoryPermission(OWNER, false);
  await saveChatWorkspace(lease, {
    type: 'draft',
    key: 'staff',
    text: 'Stale staff',
    at: Date.now(),
  });
  assert.equal((await loadChatWorkspace(lease))?.drafts.staff, undefined);
});
