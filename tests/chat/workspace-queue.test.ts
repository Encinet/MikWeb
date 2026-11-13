import assert from 'node:assert/strict';
import { test } from 'node:test';
import { messageCursor } from '@/modules/chat/model/chat-reading';
import type { ChatWorkspaceMutation } from '@/modules/chat/model/chat-workspace';
import { emptyChatWorkspace, updateChatWorkspace } from '@/modules/chat/model/chat-workspace';
import { appendWorkspaceMutation } from '@/modules/chat/model/chat-workspace-queue';
import { message, order, PEER } from './fixtures';

test('a prolonged failure queues the latest draft and preserves independent preferences and thread operations', () => {
  const destination = { channel: 'private', targetUuid: PEER, name: 'Alex' } as const;
  const mutations: ChatWorkspaceMutation[] = [];
  for (let index = 0; index < 200; index++) {
    mutations.push(
      { type: 'draft', key: 'public', text: `Draft ${index}`, at: index },
      { type: 'draft', key: `private:${PEER}`, text: 'Private draft', at: index },
      { type: 'preferences', value: { density: index % 2 ? 'compact' : 'comfortable' } },
      { type: 'preferences', value: { membersVisible: index % 3 === 0 } },
      { type: 'open', destination, at: index },
      { type: 'pin', destination, pinned: true, at: index },
      {
        type: 'close',
        destination,
        through: messageCursor(message({ id: `id-${index}`, order: order(index + 1) })),
        at: index,
      },
      { type: 'pin', destination, pinned: index % 2 === 0, at: index },
      { type: 'open', destination, at: index },
    );
  }
  mutations.push({ type: 'draft', key: 'public', text: '', at: 200 });
  const pending = mutations.reduce<ChatWorkspaceMutation[]>(appendWorkspaceMutation, []);
  assert.equal(pending.length, 6);
  assert.deepEqual(
    pending.reduce(updateChatWorkspace, emptyChatWorkspace()),
    mutations.reduce(updateChatWorkspace, emptyChatWorkspace()),
  );
});
