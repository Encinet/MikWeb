import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  decodeMessageData,
  encodeMessageData,
  storedMessage,
} from '@/modules/chat/lib/history/chat-history-codec';
import type { ChatMessage } from '@/modules/chat/model/chat-protocol';
import { chatMessageSchema } from '@/modules/chat/model/chat-protocol';
import { message, OTHER, OWNER, PEER, player } from './fixtures';

const messages: ChatMessage[] = [
  message(),
  message({ content: [{ text: '中文与 🌳，完整保留文本' }], mentioned: true }),
  message({
    sender: { id: 'game:alex', name: 'Display name', playerUuid: PEER, playerName: 'Alex' },
  }),
  message({
    sender: { id: 'web:alex', name: 'Alex', playerUuid: PEER, playerName: 'Alex' },
    source: { kind: 'web' },
    requestId: null,
  }),
  message({
    channel: 'private',
    targetUuid: OWNER,
    targetName: 'Me',
    expiresAt: Date.now() + 1000,
  }),
  message({
    channel: 'private',
    targetUuid: PEER,
    targetName: 'Alex',
    sender: player(OWNER, 'Me'),
    requestId: 'request-1',
    source: { kind: 'web' },
  }),
  message({
    channel: 'staff',
    content: [
      {
        text: 'Styled',
        style: {
          color: 0x123456,
          gradientEndColor: 0xabcdef,
          bold: true,
          italic: true,
          strikethrough: true,
          underlined: true,
        },
      },
      { text: ' link', href: 'https://example.com/path' },
      { text: ' @Alex', mention: true },
    ],
  }),
  message({
    sender: { id: 'external:1', name: 'Unbound author' },
    source: { kind: 'social', platformId: 'qq', platformName: 'QQ' },
  }),
  {
    id: 'notice',
    kind: 'server',
    channel: 'public',
    createdAt: 0,
    order: message().order,
    countsAsUnread: true,
    content: [{ text: 'Server notice' }],
  },
  {
    id: 'activity',
    kind: 'server',
    channel: 'public',
    createdAt: 1,
    order: message().order,
    countsAsUnread: false,
    content: { template: 'gameJoined', values: { name: 'Alex' } },
    subject: { playerUuid: PEER, name: 'Alex' },
  },
  {
    id: 'private-server',
    kind: 'server',
    channel: 'private',
    createdAt: 2,
    order: message().order,
    countsAsUnread: false,
    recipientUuid: OWNER,
    targetUuid: OTHER,
    targetName: 'Steve',
    content: [{ text: 'Player unavailable' }],
  },
];

test('compact messages round-trip full text, styling, social identities, private routing, and activity', () => {
  for (const value of messages) {
    const expected = chatMessageSchema.parse(value);
    assert.deepEqual(decodeMessageData(encodeMessageData(expected)), expected);
  }
});

test('malformed compact records fail protocol validation without becoming readable messages', () => {
  const data = encodeMessageData(message());
  for (const value of [
    null,
    {},
    { ...data, v: [9] },
    { ...data, c: 'unknown' },
    { ...data, t: -1 },
    { ...data, v: [0, 'id', null, 'text', 0] },
    { ...data, v: [0, 'id', ['id', 'name', 3], 'text', 0] },
    { ...data, v: [0, 'id', ['id', 'name'], 'text', 0, 'bad-options'] },
  ])
    assert.equal(decodeMessageData(value), null);
});

test('compact records share indexed message headers and omit unused unread entries', () => {
  const value = message();
  const record = storedMessage(OWNER, value);
  assert.equal(record.unread, 1);
  assert.equal(storedMessage(OWNER, value, true).unread, undefined);
  assert.equal(storedMessage(OWNER, message({ sender: player(OWNER) })).unread, undefined);
  assert.equal('message' in record, false);
  assert.equal('createdAt' in record, false);
  assert.equal('order' in record, false);
  assert.equal('bucket' in record, false);
  const bytes = (value: unknown) => new TextEncoder().encode(JSON.stringify(value)).byteLength;
  assert.ok(bytes(record.data) < bytes(value) * 0.65);
});
