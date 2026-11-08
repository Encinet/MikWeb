import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chatInputHistory } from '@/modules/chat/model/chat-input-history';
import { isValidChatInput } from '@/modules/chat/model/chat-protocol';
import { message, OTHER, OWNER, PEER, player } from './fixtures';

test('input recall keeps only the account’s own sendable messages from the requested conversation', () => {
  const messages = [
    message({
      id: 'old',
      sender: player(OWNER),
      content: [{ text: 'Hello ' }, { text: '@Alex', mention: true }],
    }),
    message({ id: 'other', sender: player(PEER), content: [{ text: 'Someone else' }] }),
    message({
      id: 'staff',
      sender: player(OWNER),
      channel: 'staff',
      content: [{ text: 'Staff message' }],
    }),
    message({
      id: 'private',
      sender: player(OWNER),
      channel: 'private',
      targetUuid: PEER,
      content: [{ text: 'Private message' }],
    }),
    message({
      id: 'other-private',
      sender: player(OWNER),
      channel: 'private',
      targetUuid: OTHER,
      content: [{ text: 'Other private message' }],
    }),
    message({ id: 'invalid', sender: player(OWNER), content: [{ text: 'Line one\nLine two' }] }),
    message({ id: 'long', sender: player(OWNER), content: [{ text: 'a'.repeat(257) }] }),
    message({
      id: 'latest',
      sender: player(OWNER),
      source: { kind: 'web' },
      content: [{ text: 'Latest message' }],
    }),
  ];
  assert.deepEqual(chatInputHistory(messages, OWNER, 'public'), [
    { id: 'old', text: 'Hello @Alex' },
    { id: 'latest', text: 'Latest message' },
  ]);
  assert.deepEqual(chatInputHistory(messages, OWNER, `private:${PEER}`), [
    { id: 'private', text: 'Private message' },
  ]);
  assert.deepEqual(chatInputHistory(messages, PEER, 'public'), [
    { id: 'other', text: 'Someone else' },
  ]);
});

test('sending and history recall share Unicode length and single-line validation', () => {
  assert.equal(isValidChatInput('😀'.repeat(256)), true);
  assert.equal(isValidChatInput('😀'.repeat(257)), false);
  assert.equal(isValidChatInput(''), false);
  for (const separator of ['\n', '\r', '\t', '\u0000', '\u007f', '\u0085', '\u2028', '\u2029'])
    assert.equal(isValidChatInput(`before${separator}after`), false);
});
