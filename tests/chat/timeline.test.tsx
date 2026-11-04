import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Window } from 'happy-dom';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { act, useRef, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ChatMessage, ChatServerMessage } from '@/modules/chat/model/chat-protocol';
import type { ChatSearchCriteria } from '@/modules/chat/model/chat-search';
import { emptyChatSearch } from '@/modules/chat/model/chat-search';
import { ChatActivityGroup } from '@/modules/chat/ui/chat-activity-group';
import { ChatMessageContent } from '@/modules/chat/ui/chat-message-content';
import { ChatMessageList } from '@/modules/chat/ui/chat-message-list';
import { ChatMessageSearch } from '@/modules/chat/ui/chat-message-search';
import { useChatScroll } from '@/modules/chat/ui/use-chat-scroll';
import englishTranslations from '../../messages/en.json';
import translations from '../../messages/zh-CN.json';
import { createBrowserEnvironment } from '../support/browser-environment';
import { message, OTHER, OWNER, PEER, STREAM } from './fixtures';

function localized(children: ReactNode) {
  return (
    <NextIntlClientProvider locale="zh-CN" timeZone="Asia/Singapore" messages={translations}>
      {children}
    </NextIntlClientProvider>
  );
}

const ACTIVITY_TIME = new Date('2026-11-03T10:00:00Z').getTime();
function activity(
  id: string,
  template: 'gameJoined' | 'gameLeft' | 'webJoined' | 'webLeft',
  name: string,
  sequence: number,
  playerUuid?: string,
): ChatServerMessage {
  return {
    kind: 'server',
    id,
    channel: 'public',
    content: { template, values: { name } },
    subject: playerUuid ? { playerUuid, name } : undefined,
    countsAsUnread: false,
    createdAt: ACTIVITY_TIME + sequence * 1000,
    sequence,
    streamId: STREAM,
  };
}

function Timeline({
  messages,
  showActivity = false,
}: {
  messages: ChatMessage[];
  showActivity?: boolean;
}) {
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
      showActivity={showActivity}
      onMention={() => undefined}
      onPrivate={() => undefined}
    />
  );
}

function ActivityNavigation({
  messages,
  revealedId,
}: {
  messages: ChatServerMessage[];
  revealedId: string | null;
}) {
  const scroll = useChatScroll('public');
  return (
    <>
      <div ref={scroll.attach}>
        <ChatActivityGroup
          messages={messages}
          highlighted={null}
          revealedId={revealedId}
          formatTime={() => '18:00'}
        />
      </div>
      <button type="button" onClick={() => scroll.toMessage('leave', true)}>
        Jump to event
      </button>
    </>
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

test('collapsed activity groups bound their preview and retain every detailed event in order', () => {
  const html = renderToStaticMarkup(
    localized(
      <Timeline
        showActivity
        messages={[
          activity('game-join', 'gameJoined', 'Steve', 1, OWNER),
          activity('other-game-join', 'gameJoined', 'Alex', 2, PEER),
          activity('game-leave', 'gameLeft', 'Sam', 3),
          activity('other-game-leave', 'gameLeft', 'Pat', 4),
          activity('web-join', 'webJoined', 'Taylor', 5),
          activity('web-leave', 'webLeft', 'Riley', 6),
          activity('repeated-game-join', 'gameJoined', 'Steve', 7),
          message({ id: 'conversation', createdAt: ACTIVITY_TIME + 8000, sequence: 8 }),
          activity('later-game-leave', 'gameLeft', 'Steve', 9),
        ]}
      />,
    ),
  );
  const window = new Window();
  try {
    window.document.body.innerHTML = html;
    const groups = window.document.querySelectorAll('.chat-activity-group');
    assert.equal(groups.length, 2, 'conversation messages separate presence groups');
    assert.equal(groups[0].tagName, 'DETAILS');
    assert.equal(groups[0].hasAttribute('open'), false);
    assert.deepEqual(
      Array.from(
        groups[0].querySelectorAll('.chat-activity-summary-line > span:first-child'),
        (line) => line.textContent,
      ),
      [
        'Steve、Alex 加入了游戏（共 3 次）',
        'Sam、Pat 退出了游戏',
        'Taylor 加入了网页聊天',
        'Riley 退出了网页聊天',
      ],
    );
    assert.equal(groups[0].querySelectorAll('summary .chat-activity-avatar').length, 6);
    const players = groups[0].querySelectorAll('.chat-activity-details .chat-activity-player');
    assert.deepEqual(
      Array.from(players, (player) => player.textContent),
      ['Steve', 'Alex', 'Sam', 'Pat', 'Taylor', 'Riley', 'Steve'],
    );
    for (const player of players) {
      const avatar = player.firstElementChild;
      assert.equal(
        avatar?.className,
        'chat-activity-avatar',
        'the avatar precedes its player name',
      );
      assert.equal(
        avatar?.getAttribute('aria-hidden'),
        'true',
        'the adjacent name labels the avatar',
      );
      assert.equal(avatar?.querySelector('img')?.getAttribute('width'), '18');
    }
    assert.ok(
      players[0]
        .querySelector('img')
        ?.getAttribute('src')
        ?.includes(`/helm/${OWNER.replaceAll('-', '')}/64`),
    );
    assert.ok(
      players[1]
        .querySelector('img')
        ?.getAttribute('src')
        ?.includes(`/helm/${PEER.replaceAll('-', '')}/64`),
    );
    const lines = groups[0].querySelectorAll('.chat-activity-line');
    assert.deepEqual(
      Array.from(lines, (line) => line.getAttribute('data-chat-message')),
      [
        'game-join',
        'other-game-join',
        'game-leave',
        'other-game-leave',
        'web-join',
        'web-leave',
        'repeated-game-join',
      ],
    );
    assert.equal(groups[1].querySelectorAll('.chat-activity-line').length, 1);
    assert.equal(groups[1].tagName, 'UL', 'a single event is shown without a disclosure');
    assert.equal(groups[1].querySelector('summary'), null);
    for (const [id, text, sequence] of [
      ['game-join', 'Steve 加入了游戏', 1],
      ['other-game-join', 'Alex 加入了游戏', 2],
      ['game-leave', 'Sam 退出了游戏', 3],
      ['other-game-leave', 'Pat 退出了游戏', 4],
      ['web-join', 'Taylor 加入了网页聊天', 5],
      ['web-leave', 'Riley 退出了网页聊天', 6],
      ['repeated-game-join', 'Steve 加入了游戏', 7],
      ['later-game-leave', 'Steve 退出了游戏', 9],
    ] as const) {
      const line = window.document.querySelector(`[data-chat-message="${id}"]`);
      assert.ok(line);
      assert.ok(line.textContent.includes(text));
      assert.equal(line.querySelector('.chat-activity-avatar img')?.getAttribute('width'), '18');
      assert.equal(line.getAttribute('tabindex'), '-1', 'search can focus each activity');
      const time = line.querySelector('time');
      assert.equal(
        time?.getAttribute('datetime'),
        new Date(ACTIVITY_TIME + sequence * 1000).toISOString(),
      );
      assert.ok(time?.textContent.trim());
    }
  } finally {
    void window.happyDOM.close();
  }
});

test('compact activity summaries support English and preserve unstructured server messages in details', () => {
  const html = renderToStaticMarkup(
    <NextIntlClientProvider locale="en" timeZone="Asia/Singapore" messages={englishTranslations}>
      <ChatActivityGroup
        messages={[
          activity('join-a', 'gameJoined', 'Alex', 1),
          activity('join-b', 'gameJoined', 'Steve', 2),
          activity('join-c', 'gameJoined', 'Robin', 3),
          {
            ...activity('notice', 'gameLeft', 'Alex', 4, OTHER),
            content: [{ text: 'Server notice' }],
          },
        ]}
        highlighted={null}
        revealedId={null}
        formatTime={() => '18:00'}
      />
    </NextIntlClientProvider>,
  );
  const window = new Window();
  try {
    window.document.body.innerHTML = html;
    assert.deepEqual(
      Array.from(
        window.document.querySelectorAll('.chat-activity-summary-line > span:first-child'),
        (line) => line.textContent,
      ),
      ['Alex, Steve, and others (3 players total) joined the game', '1 other system update'],
    );
    assert.ok(
      window.document
        .querySelector('.chat-activity-player img')
        ?.getAttribute('src')
        ?.includes('/helm/Alex/64'),
    );
    assert.ok(
      window.document
        .querySelector('.chat-activity-details > li:last-child img')
        ?.getAttribute('src')
        ?.includes(`/helm/${OTHER.replaceAll('-', '')}/64`),
    );
    assert.ok(
      window.document
        .querySelector('.chat-activity-details > li:last-child')
        ?.textContent.includes('Server notice'),
    );
  } finally {
    void window.happyDOM.close();
  }
});

test('large activity summaries bound participants per action and distinguish people from repeated events', () => {
  const window = new Window();
  try {
    for (const samePlayer of [false, true]) {
      const templates = ['gameJoined', 'gameLeft', 'webJoined', 'webLeft'] as const;
      const messages = Array.from({ length: 200 }, (_, index) =>
        activity(
          `event-${index}`,
          templates[index % templates.length],
          samePlayer ? 'Steve' : `Player${index}`,
          index,
        ),
      );
      window.document.body.innerHTML = renderToStaticMarkup(
        localized(
          <ChatActivityGroup
            messages={messages}
            highlighted={null}
            revealedId={null}
            formatTime={() => '18:00'}
          />,
        ),
      );
      const summary = window.document.querySelector('summary');
      assert.ok(summary);
      const lines = summary.querySelectorAll('.chat-activity-summary-line');
      assert.equal(lines.length, 4);
      for (const line of lines) {
        assert.equal(line.querySelectorAll('.chat-activity-player').length, samePlayer ? 1 : 2);
        assert.ok(line.textContent.includes(samePlayer ? '共 50 次' : '等 50 人'));
      }
      assert.deepEqual(
        Array.from(lines, (line) => line.querySelector('span')?.textContent),
        samePlayer
          ? [
              'Steve 加入了游戏（共 50 次）',
              'Steve 退出了游戏（共 50 次）',
              'Steve 加入了网页聊天（共 50 次）',
              'Steve 退出了网页聊天（共 50 次）',
            ]
          : [
              'Player0、Player4 等 50 人 加入了游戏',
              'Player1、Player5 等 50 人 退出了游戏',
              'Player2、Player6 等 50 人 加入了网页聊天',
              'Player3、Player7 等 50 人 退出了网页聊天',
            ],
      );
      assert.equal(window.document.querySelectorAll('.chat-activity-line').length, 200);
      assert.equal(window.document.querySelector('details')?.hasAttribute('open'), false);
    }
  } finally {
    void window.happyDOM.close();
  }
});

test('quiet activity spans long gaps but conversation messages and dates still separate groups', () => {
  const window = new Window();
  try {
    window.document.body.innerHTML = renderToStaticMarkup(
      localized(
        <Timeline
          showActivity
          messages={[
            activity('early', 'gameJoined', 'Alex', 1),
            { ...activity('later', 'gameLeft', 'Alex', 2), createdAt: ACTIVITY_TIME + 600_000 },
            message({ id: 'conversation', createdAt: ACTIVITY_TIME + 610_000, sequence: 3 }),
            {
              ...activity('after-chat', 'webJoined', 'Steve', 4),
              createdAt: ACTIVITY_TIME + 620_000,
            },
            {
              ...activity('next-day', 'webLeft', 'Steve', 5),
              createdAt: ACTIVITY_TIME + 86_400_000,
            },
          ]}
        />,
      ),
    );
    const groups = window.document.querySelectorAll('.chat-activity-group');
    assert.equal(groups.length, 3);
    assert.deepEqual(
      Array.from(groups, (group) => group.querySelectorAll('.chat-activity-line').length),
      [2, 1, 1],
    );
    assert.equal(window.document.querySelectorAll('.chat-date').length, 2);
    const times = groups[0].querySelectorAll('.chat-activity-line time');
    assert.equal(
      groups[0].querySelector('.chat-activity-expanded-heading time')?.getAttribute('title'),
      `${times[0].textContent} – ${times[1].textContent}`,
    );
  } finally {
    void window.happyDOM.close();
  }
});

test('single activities stay visible while multiple activities expand, collapse and reveal search targets', async () => {
  const browser = createBrowserEnvironment();
  const messages = [
    activity('join', 'gameJoined', 'Alex', 1),
    activity('leave', 'gameLeft', 'Steve', 2),
  ];
  try {
    await act(async () =>
      browser.root.render(
        localized(<ActivityNavigation messages={messages.slice(1)} revealedId="leave" />),
      ),
    );
    assert.equal(document.querySelector('details'), null);
    assert.equal(document.querySelector('summary'), null);
    const single = document.querySelector('[data-chat-message="leave"]');
    assert.ok(single);
    assert.ok(single.textContent.includes('Steve 退出了游戏'));
    assert.ok(single.querySelector('.chat-activity-avatar img'));
    assert.ok(single.querySelector('time'));
    const singleJump = document.querySelector('button');
    assert.ok(singleJump);
    await act(async () => singleJump.click());
    assert.equal(document.activeElement, single, 'a single event can be focused without expanding');
    await act(async () =>
      browser.root.render(localized(<ActivityNavigation messages={messages} revealedId={null} />)),
    );
    const group = document.querySelector('details');
    const summary = group?.querySelector('summary');
    assert.ok(group && summary);
    assert.equal(group.open, false);
    await act(async () => summary.click());
    assert.equal(group.open, true);
    assert.equal(group.querySelectorAll('.chat-activity-line').length, 2);
    await act(async () => summary.click());
    assert.equal(group.open, false);
    const jump = document.querySelector('button');
    assert.ok(jump);
    await act(async () => jump.click());
    assert.equal(group.open, true);
    assert.equal(document.activeElement?.getAttribute('data-chat-message'), 'leave');
    await act(async () => summary.click());
    assert.equal(group.open, false);
    await act(async () =>
      browser.root.render(localized(<ActivityNavigation messages={messages} revealedId="leave" />)),
    );
    assert.equal(group.open, true, 'a search result opens the matching event group');
    await act(async () =>
      browser.root.render(
        localized(<ActivityNavigation messages={messages.slice(1)} revealedId="leave" />),
      ),
    );
    assert.equal(
      document.querySelector('details'),
      null,
      'returning to one event removes the disclosure',
    );
    assert.equal(document.querySelectorAll('[data-chat-message]').length, 1);
  } finally {
    await browser.close();
  }
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

function SearchFilters() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [criteria, setCriteria] = useState<ChatSearchCriteria>(() => ({
    ...emptyChatSearch('all'),
    query: 'spawn',
    source: 'game',
  }));
  return (
    <ChatMessageSearch
      id="search"
      inputRef={inputRef}
      open
      criteria={criteria}
      onCriteriaChange={setCriteria}
      messages={[
        message({ id: 'mention', mentioned: true, content: [{ text: 'Meet at spawn' }] }),
        message({ id: 'ordinary', content: [{ text: 'Spawn is ready' }] }),
        message({ id: 'web', source: 'web', content: [{ text: 'Hello spawn' }] }),
        message({ id: 'elsewhere', content: [{ text: 'See you at the gate' }] }),
      ]}
      owner={OWNER}
      conversation={{ channel: 'public' }}
      onChoose={() => undefined}
      onClose={() => undefined}
    />
  );
}

test('mentions can be toggled within search filters and clearing filters preserves the query and scope', async () => {
  const browser = createBrowserEnvironment();
  try {
    await act(async () => browser.root.render(localized(<SearchFilters />)));
    const filters = document.querySelector('details');
    const checkbox = document.querySelector<HTMLInputElement>('input[type="checkbox"]');
    assert.ok(filters && checkbox);
    filters.open = true;
    assert.equal(document.querySelectorAll('[data-chat-panel-result]').length, 2);
    await act(async () => checkbox.click());
    assert.equal(checkbox.checked, true);
    assert.equal(document.querySelectorAll('[data-chat-panel-result]').length, 1);
    assert.ok(document.querySelector('[data-chat-panel-result]')?.textContent?.includes('Meet at'));
    assert.equal(document.querySelector('.chat-filter-count')?.textContent, '2');
    const clear = document.querySelector<HTMLButtonElement>(
      '.chat-filter-fields .chat-text-button',
    );
    assert.ok(clear);
    await act(async () => clear.click());
    assert.equal(checkbox.checked, false);
    assert.equal(document.querySelector<HTMLInputElement>('input[type="search"]')?.value, 'spawn');
    assert.equal(
      document.querySelector('.chat-search-scope button:last-child')?.getAttribute('aria-pressed'),
      'true',
    );
    assert.equal(document.querySelector('.chat-filter-count'), null);
    assert.equal(document.querySelectorAll('[data-chat-panel-result]').length, 3);
  } finally {
    await browser.close();
  }
});
