import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Window } from 'happy-dom';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ChatMessage, ChatServerMessage } from '@/modules/chat/model/chat-protocol';
import { emptyChatSearch } from '@/modules/chat/model/chat-search';
import { ChatMessageContent } from '@/modules/chat/ui/chat-message-content';
import { ChatMessageList } from '@/modules/chat/ui/chat-message-list';
import { ChatMessageSearch } from '@/modules/chat/ui/chat-message-search';
import { useChatScroll } from '@/modules/chat/ui/use-chat-scroll';
import translations from '../../messages/zh-CN.json';
import { message, OWNER, STREAM } from './fixtures';

function localized(children: ReactNode) {
  return (
    <NextIntlClientProvider locale="zh-CN" timeZone="Asia/Singapore" messages={translations}>
      {children}
    </NextIntlClientProvider>
  );
}

function Timeline({ messages }: { messages: ChatMessage[] }) {
  const scroll = useChatScroll('public');
  return (
    <ChatMessageList
      conversation="public"
      destination={{ channel: 'public' }}
      title="公共"
      owner={OWNER}
      name="Owner"
      messages={messages}
      pending={[]}
      jump={null}
      paused={false}
      scroll={scroll}
      onRead={() => undefined}
      onRestore={() => undefined}
      onJumpComplete={() => undefined}
      showActivity={false}
      onMention={() => undefined}
      onPrivate={() => undefined}
    />
  );
}

test('hiding a large block of presence events keeps older conversation messages in the initial page', () => {
  const now = Date.now();
  const activities = Array.from(
    { length: 200 },
    (_, index): ChatServerMessage => ({
      kind: 'server',
      id: `activity-${index}`,
      channel: 'public',
      content: { template: 'gameJoined', values: { name: 'Steve' } },
      countsAsUnread: false,
      createdAt: now - 2000 + index,
      sequence: index + 2,
      streamId: STREAM,
    }),
  );
  const html = renderToStaticMarkup(
    localized(
      <Timeline
        messages={[
          message({
            createdAt: now - 5000,
            content: [{ text: 'Older conversation is still visible' }],
          }),
          ...activities,
        ]}
      />,
    ),
  );
  assert.ok(html.includes('Older conversation is still visible'));
  assert.ok(!html.includes('条玩家动态'));
  assert.ok(!html.includes('查看更早消息'));
});

test('coordinate menus preserve valid paragraph structure and do not replace links or mention parts', () => {
  const html = renderToStaticMarkup(
    localized(
      <p>
        <ChatMessageContent
          content={[
            { text: '主世界: 120, 64, -300' },
            { text: ' https://example.com/1,2,3', href: 'https://example.com/1,2,3' },
            { text: '@Alex', mention: true },
          ]}
        />
      </p>,
    ),
  );
  const window = new Window();
  window.document.body.innerHTML = html;
  assert.equal(window.document.querySelectorAll('p').length, 1);
  assert.equal(window.document.querySelectorAll('.chat-coordinate-trigger').length, 1);
  assert.equal(
    window.document.querySelector('p > .chat-action-menu button')?.getAttribute('aria-haspopup'),
    'dialog',
  );
  assert.equal(
    window.document.querySelector('a')?.getAttribute('href'),
    'https://example.com/1,2,3',
  );
  assert.equal(window.document.querySelector('.chat-mention')?.textContent, '@Alex');
  void window.happyDOM.close();
});

test('search highlights literal brackets and renders matching results with the filter controls', () => {
  const html = renderToStaticMarkup(
    localized(
      <ChatMessageSearch
        id="search"
        inputRef={{ current: null }}
        open
        criteria={{ ...emptyChatSearch(), query: '[x]' }}
        onCriteriaChange={() => undefined}
        messages={[message({ content: [{ text: 'Use [x] at spawn' }] })]}
        owner={OWNER}
        conversation={{ channel: 'public' }}
        onChoose={() => undefined}
        onClose={() => undefined}
      />,
    ),
  );
  assert.ok(html.includes('<mark>[x]</mark>'));
  assert.ok(html.includes('data-chat-panel-result'));
  assert.ok(html.includes('开始日期'));
  assert.ok(html.includes('消息来源'));
});
