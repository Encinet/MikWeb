import assert from 'node:assert/strict';
import { test } from 'node:test';
import { keepChatWorkspace } from '@/modules/chat/model/chat-connection';
import { messageCursor } from '@/modules/chat/model/chat-reading';
import {
  chatThreads,
  emptyChatWorkspace,
  readChatWorkspace,
  updateChatWorkspace,
} from '@/modules/chat/model/chat-workspace';
import { message, OTHER, OWNER, PEER } from './fixtures';

const destination = { channel: 'private', targetUuid: PEER, name: 'Alex' } as const;

test('temporary disconnections keep the workspace, but initial connections and revoked accounts do not', () => {
  assert.equal(keepChatWorkspace({ status: 'connecting' }, false), false);
  assert.equal(keepChatWorkspace({ status: 'reconnecting' }, true), true);
  assert.equal(keepChatWorkspace({ status: 'authorizing' }, true), true);
  assert.equal(keepChatWorkspace({ status: 'error', error: 'connection_failed' }, true), true);
  for (const error of [
    'session_revoked',
    'credentials_changed',
    'chat_forbidden',
    'session_changed',
    'unauthenticated',
  ])
    assert.equal(keepChatWorkspace({ status: 'error', error }, true), false);
});

test('closing hides a conversation without deleting history; a new message reopens it even within the same millisecond', () => {
  const first = message({ channel: 'private', targetUuid: OWNER });
  let workspace = updateChatWorkspace(emptyChatWorkspace(), {
    type: 'close',
    destination,
    through: messageCursor(first),
    at: Date.now(),
  });
  assert.equal(chatThreads([first], [], OWNER, workspace).length, 0);
  const next = message({ ...first, id: 'message-2', sequence: 2 });
  assert.equal(chatThreads([first, next], [], OWNER, workspace).length, 1);
  workspace = updateChatWorkspace(workspace, { type: 'open', destination, at: Date.now() });
  assert.equal(chatThreads([first], [], OWNER, workspace).length, 1);
});

test('a closed empty conversation stays closed until a message arrives', () => {
  const workspace = updateChatWorkspace(emptyChatWorkspace(), {
    type: 'close',
    destination,
    through: null,
    at: Date.now(),
  });
  assert.equal(chatThreads([], [], OWNER, workspace).length, 0);
  assert.equal(
    chatThreads([message({ channel: 'private', targetUuid: OWNER })], [], OWNER, workspace).length,
    1,
  );
});

test('pinned conversations precede newer messages and previews use the latest sender name and presence', () => {
  const now = Date.now();
  const older = message({ channel: 'private', targetUuid: OWNER, createdAt: now - 5000 });
  const newer = message({
    id: 'new',
    senderUuid: OTHER,
    senderName: 'Steve',
    channel: 'private',
    targetUuid: OWNER,
    createdAt: now,
  });
  const workspace = updateChatWorkspace(emptyChatWorkspace(), {
    type: 'pin',
    destination,
    pinned: true,
    at: now - 10000,
  });
  const threads = chatThreads(
    [newer, older],
    [{ playerUuid: PEER, name: 'AlexRenamed', game: true, webConnections: 0 }],
    OWNER,
    workspace,
  );
  assert.deepEqual(
    threads.map((thread) => thread.destination.targetUuid),
    [PEER, OTHER],
  );
  assert.equal(threads[0].destination.name, 'AlexRenamed');
  assert.equal(threads[0].peer?.game, true);
  assert.equal(threads[1].latest?.id, 'new');
});

test('draft updates are isolated and staff drafts are removed on permission loss', () => {
  const original = emptyChatWorkspace();
  let workspace = updateChatWorkspace(original, {
    type: 'draft',
    key: 'public',
    text: 'Public draft',
    at: Date.now(),
  });
  workspace = updateChatWorkspace(workspace, {
    type: 'draft',
    key: 'staff',
    text: 'Staff draft',
    at: Date.now(),
  });
  assert.deepEqual(original.drafts, {});
  assert.equal(readChatWorkspace(workspace, false).drafts.staff, undefined);
  assert.equal(readChatWorkspace(workspace, false).drafts.public.text, 'Public draft');
});

test('expired drafts are removed and malformed stored state never enters the workspace', () => {
  const now = Date.now();
  const workspace = updateChatWorkspace(emptyChatWorkspace(), {
    type: 'draft',
    key: 'public',
    text: 'Expired',
    at: now - 31 * 86400000,
  });
  assert.deepEqual(readChatWorkspace(workspace, false, now).drafts, {});
  assert.deepEqual(
    readChatWorkspace({ drafts: { public: { text: { html: 'bad' } } } }, true),
    emptyChatWorkspace(),
  );
});

test('opening an older conversation does not reorder it ahead of more recent messages', () => {
  const now = Date.now();
  const workspace = updateChatWorkspace(emptyChatWorkspace(), {
    type: 'open',
    destination,
    at: now,
  });
  const older = message({ channel: 'private', targetUuid: OWNER, createdAt: now - 5000 });
  const newer = message({
    id: 'newer',
    senderUuid: OTHER,
    senderName: 'Steve',
    channel: 'private',
    targetUuid: OWNER,
    createdAt: now - 1000,
  });
  assert.deepEqual(
    chatThreads([older, newer], [], OWNER, workspace).map(
      (thread) => thread.destination.targetUuid,
    ),
    [OTHER, PEER],
  );
});

test('pinned conversations and conversations with a current draft survive history aging', () => {
  const now = Date.now();
  let workspace = updateChatWorkspace(emptyChatWorkspace(), {
    type: 'pin',
    destination,
    pinned: true,
    at: now - 31 * 86400000,
  });
  assert.equal(chatThreads([], [], OWNER, readChatWorkspace(workspace, false, now)).length, 1);
  workspace = updateChatWorkspace(workspace, {
    type: 'pin',
    destination,
    pinned: false,
    at: now - 31 * 86400000,
  });
  workspace = updateChatWorkspace(workspace, {
    type: 'draft',
    key: `private:${PEER}`,
    text: 'Still drafting',
    at: now,
  });
  assert.equal(
    chatThreads([], [], OWNER, readChatWorkspace(workspace, false, now))[0].draft,
    'Still drafting',
  );
});
