import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NextIntlClientProvider } from 'next-intl';
import { renderToStaticMarkup } from 'react-dom/server';
import { upgradeChatHistoryMessage } from '@/modules/chat/lib/chat-history-upgrade';
import { UnsupportedChatHistoryError } from '@/modules/chat/model/chat-history-compatibility';
import {
  chatMessageSchema,
  countsAsUnread,
  messageDestination,
} from '@/modules/chat/model/chat-protocol';
import { emptyChatSearch, matchesChatSearch } from '@/modules/chat/model/chat-search';
import { chatTimelineGroups } from '@/modules/chat/model/chat-timeline';
import { ChatAuthorAvatar } from '@/modules/chat/ui/chat-author-avatar';
import { ChatMessageActions } from '@/modules/chat/ui/chat-message-actions';
import translations from '../../messages/en.json';
import { message, OWNER, PEER, player } from './fixtures';

function social(id = 'external:guest', name = 'Guest') {
  return message({
    sender: { id, name },
    source: { kind: 'social', platformId: 'matrix', platformName: 'Matrix' },
  });
}

test('social messages accept unbound and offline bound authors while preserving public scope', () => {
  const guest = social();
  assert.equal(chatMessageSchema.safeParse(guest).success, true);
  assert.equal(chatMessageSchema.safeParse({ ...guest, sender: player(PEER) }).success, true);
  assert.equal(chatMessageSchema.safeParse({ ...guest, channel: 'staff' }).success, false);
  assert.equal(
    chatMessageSchema.safeParse({ ...guest, channel: 'private', targetUuid: OWNER }).success,
    false,
  );
  assert.deepEqual(messageDestination(guest, OWNER), { channel: 'public' });
  assert.equal(countsAsUnread(guest, OWNER), true);
});

test('author grouping and search use stable identity independently of names and player bindings', () => {
  const first = social('external:first', 'Same name');
  const second = social('external:second', 'Same name');
  assert.equal(chatTimelineGroups([first, second], [], OWNER, 'Owner', 0).length, 2);
  assert.equal(
    chatTimelineGroups([first, { ...first, id: 'next', sequence: 2 }], [], OWNER, 'Owner', 0)
      .length,
    1,
  );
  const criteria = { ...emptyChatSearch(), author: 'external:second', source: 'social' as const };
  assert.equal(matchesChatSearch(first, '', '', criteria, OWNER, 'public'), false);
  assert.equal(matchesChatSearch(second, '', '', criteria, OWNER, 'public'), true);
});

test('unbound authors render without Minecraft lookups or player mention and private actions', () => {
  const guest = social();
  const avatar = renderToStaticMarkup(<ChatAuthorAvatar sender={guest.sender} size={40} />);
  assert.match(avatar, /chat-author-placeholder/);
  assert.doesNotMatch(avatar, /<img/);
  const actions = renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={translations}>
      <ChatMessageActions
        message={guest}
        owner={OWNER}
        onMention={() => undefined}
        onPrivate={() => undefined}
        onCopied={() => undefined}
        onSelectText={() => undefined}
      />
    </NextIntlClientProvider>,
  );
  assert.match(actions, /Copy/);
  assert.doesNotMatch(actions, /Mention|Private message/);
});

test('storage upgrade preserves player records and rejects invalid converted identities', () => {
  const current = message();
  const { sender, source, ...rest } = current;
  const stored = {
    ...rest,
    kind: 'player',
    senderUuid: sender.playerUuid,
    senderName: sender.name,
    source: source.kind,
  };
  assert.deepEqual(upgradeChatHistoryMessage(stored), current);
  assert.throws(
    () => upgradeChatHistoryMessage({ ...stored, senderUuid: 'invalid' }),
    UnsupportedChatHistoryError,
  );
  const guest = social();
  assert.deepEqual(upgradeChatHistoryMessage(guest), guest);
});
