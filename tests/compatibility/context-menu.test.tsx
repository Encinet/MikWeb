import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { act, useState } from 'react';
import { closeChatActionMenus } from '@/modules/chat/lib/chat-action-menu-events';
import { emptyChatWorkspace } from '@/modules/chat/model/chat-workspace';
import { ChatContextMenu } from '@/modules/chat/ui/chat-context-menu';
import { ChatMessageList } from '@/modules/chat/ui/chat-message-list';
import { ChatNavigation } from '@/modules/chat/ui/chat-navigation';
import { useChatScroll } from '@/modules/chat/ui/use-chat-scroll';
import translations from '../../messages/zh-CN.json';
import { message, OWNER, PEER } from '../chat/fixtures';
import { createBrowserEnvironment } from '../support/browser-environment';

let browser: ReturnType<typeof createBrowserEnvironment>;

function localized(children: ReactNode) {
  return (
    <NextIntlClientProvider locale="zh-CN" timeZone="Asia/Singapore" messages={translations}>
      {children}
    </NextIntlClientProvider>
  );
}

function Timeline({
  onMention = () => undefined,
  onPrivate = () => undefined,
}: {
  onMention?: (name: string) => void;
  onPrivate?: (uuid: string, name: string) => void;
}) {
  const scroll = useChatScroll('public');
  return (
    <ChatMessageList
      conversation="public"
      destination={{ channel: 'public' }}
      title="公共"
      owner={OWNER}
      name="Owner"
      messages={[
        message({
          content: [{ text: 'Hello ' }, { text: 'example.com', href: 'https://example.com' }],
        }),
      ]}
      pending={[]}
      jump={null}
      paused
      scroll={scroll}
      onRead={() => undefined}
      onRestore={() => undefined}
      onJumpComplete={() => undefined}
      showActivity
      onMention={onMention}
      onPrivate={onPrivate}
    />
  );
}

function Row({ onChoose = () => undefined }: { onChoose?: () => void }) {
  return (
    <ChatContextMenu
      label="Conversation"
      actions={() => (
        <button type="button" role="menuitem" tabIndex={-1} data-chat-menu-close>
          Pin
        </button>
      )}
    >
      {(target) => (
        <button {...target} type="button" data-row onClick={onChoose}>
          Alex
        </button>
      )}
    </ChatContextMenu>
  );
}

function Navigation({ chosen }: { chosen: string[] }) {
  const [pinned, setPinned] = useState(false);
  const [closed, setClosed] = useState(false);
  return (
    <ChatNavigation
      selected={{ channel: 'public' }}
      staff={false}
      threads={
        closed
          ? []
          : [
              {
                destination: { channel: 'private', targetUuid: PEER, name: 'Alex' },
                pinned,
                latest: null,
                peer: undefined,
                draft: '',
                activityAt: 0,
              },
            ]
      }
      unread={new Map()}
      onChoose={(destination) => chosen.push(destination.channel)}
      onNewPrivate={() => undefined}
      privatePanelId="people"
      privatePanelOpen={false}
      drafts={emptyChatWorkspace().drafts}
      online
      onPin={() => setPinned((value) => !value)}
      onCloseThread={() => setClosed(true)}
    />
  );
}

function element(selector: string): HTMLElement {
  const found = document.querySelector<HTMLElement>(selector);
  assert.ok(found, selector);
  return found;
}
function context(target: Element, x = 120, y = 160, shiftKey = false) {
  const event = new browser.window.MouseEvent('contextmenu', {
    bubbles: true,
    cancelable: true,
    button: 2,
    clientX: x,
    clientY: y,
    shiftKey,
  });
  Reflect.apply(target.dispatchEvent, target, [event]);
  return event;
}
function key(target: HTMLElement, value: string, shiftKey = false) {
  Reflect.apply(target.dispatchEvent, target, [
    new browser.window.KeyboardEvent('keydown', {
      key: value,
      shiftKey,
      bubbles: true,
      cancelable: true,
    }),
  ]);
}
function pointer(target: HTMLElement, type: string, x = 40, y = 80, id = 1, primary = true) {
  Reflect.apply(target.dispatchEvent, target, [
    new browser.window.PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      pointerType: 'touch',
      pointerId: id,
      isPrimary: primary,
      button: 0,
      clientX: x,
      clientY: y,
    }),
  ]);
}
function menu() {
  return document.querySelector<HTMLElement>('[role="menu"][data-chat-menu-open]');
}

beforeEach(() => {
  browser = createBrowserEnvironment();
  const prototype = browser.window.HTMLElement.prototype;
  Object.defineProperty(prototype, 'showPopover', { configurable: true, value: undefined });
  Object.defineProperty(prototype, 'hidePopover', { configurable: true, value: undefined });
  Object.defineProperty(prototype, 'getClientRects', {
    configurable: true,
    value: () => [new browser.window.DOMRect()],
  });
});
afterEach(async () => browser.close());

test('message right-click opens actions at the pointer without a three-dot button and supports keyboard dismissal', async () => {
  let mentioned = '';
  await act(async () =>
    browser.root.render(
      localized(
        <Timeline
          onMention={(name) => {
            mentioned = name;
          }}
        />,
      ),
    ),
  );
  const row = element('[data-chat-message]');
  assert.equal(row.querySelector('.chat-menu-trigger'), null);
  await act(async () => {
    assert.equal(context(row).defaultPrevented, true);
  });
  const popup = menu();
  assert.ok(popup);
  assert.equal(popup.parentElement, document.body);
  assert.equal(popup.style.left, '120px');
  assert.equal(popup.style.top, '160px');
  const actions = popup.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
  assert.equal(actions.length, 3);
  assert.equal(document.activeElement, actions[0]);
  await act(async () => key(actions[0], 'ArrowDown'));
  assert.equal(document.activeElement, actions[1]);
  await act(async () => actions[1].click());
  assert.equal(mentioned, 'Alex');
  assert.equal(menu(), null);
  assert.equal(document.activeElement, row);
  await act(async () => context(row));
  await act(async () => key(element('[role="menuitem"]'), 'Escape'));
  assert.equal(menu(), null);
  assert.equal(document.activeElement, row);
});

test('message keyboard controls open with Shift+F10 or the menu key and Tab resumes the message tab order', async () => {
  await act(async () => browser.root.render(localized(<Timeline />)));
  const opener = element('[data-chat-context-keyboard]');
  const link = element('.chat-message__text a');
  opener.focus();
  await act(async () => key(opener, 'F10', true));
  assert.ok(menu());
  await act(async () => key(element('[role="menuitem"]'), 'Tab'));
  assert.equal(menu(), null);
  assert.equal(document.activeElement, link);
  opener.focus();
  await act(async () => key(opener, 'ContextMenu'));
  assert.ok(menu());
  await act(async () => key(element('[role="menuitem"]'), 'Escape'));
  assert.equal(document.activeElement, opener);
});

test('links, nested SVG controls, selected text and Shift+right-click keep their native menus', async () => {
  await act(async () => browser.root.render(localized(<Timeline />)));
  const row = element('[data-chat-message]');
  const link = element('.chat-message__text a');
  link.innerHTML = '<svg><path d="M0 0" /></svg>example.com';
  const path = link.querySelector('path');
  assert.ok(path);
  await act(async () => {
    assert.equal(context(link).defaultPrevented, false);
    assert.equal(context(path).defaultPrevented, false);
    assert.equal(context(row, 100, 100, true).defaultPrevented, false);
  });
  const selection = window.getSelection();
  const range = document.createRange();
  const content = row.querySelector('p');
  assert.ok(selection && content);
  range.selectNodeContents(content);
  selection.addRange(range);
  await act(async () => {
    assert.equal(context(row).defaultPrevented, false);
  });
  assert.equal(menu(), null);
});

test('long-press opens conversation actions and releasing it does not select the conversation', async () => {
  let chosen = 0;
  await act(async () =>
    browser.root.render(
      <Row
        onChoose={() => {
          chosen++;
        }}
      />,
    ),
  );
  const row = element('[data-row]');
  await act(async () => pointer(row, 'pointerdown'));
  assert.equal(menu(), null);
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 590));
  });
  assert.ok(menu());
  await act(async () => {
    pointer(row, 'pointerup');
    row.click();
  });
  assert.equal(chosen, 0);
  await act(async () => key(element('[role="menuitem"]'), 'Escape'));
  await act(async () => {
    pointer(row, 'pointerdown');
    pointer(row, 'pointerup');
    row.click();
  });
  assert.equal(chosen, 1);
});

test('dragging, pointer cancellation, scrolling and additional fingers cancel long-press', async () => {
  await act(async () => browser.root.render(<Row />));
  const row = element('[data-row]');
  await act(async () => {
    pointer(row, 'pointerdown');
    pointer(row, 'pointermove', 60, 100);
  });
  await act(async () => {
    pointer(row, 'pointerdown');
    pointer(row, 'pointercancel');
  });
  await act(async () => pointer(row, 'pointerdown'));
  await act(async () => document.dispatchEvent(new Event('scroll')));
  await act(async () => pointer(row, 'pointerdown'));
  await act(async () => pointer(document.body, 'pointerdown', 40, 80, 2, false));
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 590));
  });
  assert.equal(menu(), null);
  assert.equal(row.hasAttribute('data-chat-context-press'), false);
});

test('private conversations expose current pin and close actions without selecting the row', async () => {
  const chosen: string[] = [];
  await act(async () => browser.root.render(localized(<Navigation chosen={chosen} />)));
  const row = element('.chat-thread-link');
  assert.equal(document.querySelector('.chat-threads .chat-menu-trigger'), null);
  await act(async () => context(row));
  assert.deepEqual(chosen, []);
  await act(async () => element('[role="menuitem"]').click());
  assert.equal(menu(), null);
  await act(async () => context(row));
  assert.ok(menu()?.textContent?.includes('取消置顶'));
  const items = menu()?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
  assert.ok(items);
  await act(async () => items[1].click());
  assert.equal(document.querySelector('.chat-thread-link'), null);
  assert.deepEqual(chosen, []);
});

test('context menus respect visual viewport safe bounds and keep modal ownership', async () => {
  const viewport = Object.assign(new browser.window.EventTarget(), {
    offsetLeft: 30,
    offsetTop: 50,
    width: 320,
    height: 220,
  });
  Object.defineProperty(browser.window, 'visualViewport', { configurable: true, value: viewport });
  document.documentElement.style.cssText =
    '--viewport-top-inset:20px;--viewport-right-inset:10px;--viewport-bottom-inset:30px;--viewport-left-inset:15px';
  const prototype = browser.window.HTMLElement.prototype;
  Object.defineProperty(prototype, 'offsetWidth', {
    configurable: true,
    get() {
      return this.getAttribute('role') === 'menu' ? 180 : 0;
    },
  });
  Object.defineProperty(prototype, 'offsetHeight', {
    configurable: true,
    get() {
      return this.getAttribute('role') === 'menu' ? 100 : 0;
    },
  });
  await act(async () =>
    browser.root.render(
      <dialog open>
        <Row />
      </dialog>,
    ),
  );
  await act(async () => context(element('[data-row]'), 600, 600));
  const popup = menu();
  assert.ok(popup);
  assert.equal(popup.parentElement, document.querySelector('dialog'));
  assert.equal(popup.style.left, '152px');
  assert.equal(popup.style.top, '132px');
  viewport.height = 170;
  await act(async () => viewport.dispatchEvent(new browser.window.Event('resize')));
  assert.equal(popup.style.top, '82px');
  await act(async () => closeChatActionMenus());
  assert.equal(menu(), null);
});

test('native popovers use the same focus and dismissal lifecycle without a portal or competing menus', async () => {
  const prototype = browser.window.HTMLElement.prototype;
  const matches = prototype.matches;
  prototype.matches = function (selector: string) {
    return selector === ':popover-open'
      ? this.hasAttribute('data-native-open')
      : matches.call(this, selector);
  };
  const toggle = (element: HTMLElement, open: boolean) => {
    element.toggleAttribute('data-native-open', open);
    const event = new Event('toggle');
    Object.assign(event, { newState: open ? 'open' : 'closed' });
    element.dispatchEvent(event);
  };
  Object.defineProperties(prototype, {
    showPopover: {
      configurable: true,
      value: function (this: HTMLElement) {
        toggle(this, true);
      },
    },
    hidePopover: {
      configurable: true,
      value: function (this: HTMLElement) {
        toggle(this, false);
      },
    },
  });
  await act(async () =>
    browser.root.render(
      <>
        <Row />
        <Row />
      </>,
    ),
  );
  const rows = document.querySelectorAll<HTMLElement>('[data-row]');
  await act(async () => context(rows[0]));
  const first = menu();
  assert.ok(first);
  assert.equal(first.parentElement, browser.container);
  assert.equal(first.getAttribute('popover'), 'auto');
  assert.equal(document.activeElement, first.querySelector('button'));
  await act(async () => context(rows[1]));
  const second = menu();
  assert.ok(second && second !== first);
  assert.equal(first.hasAttribute('data-native-open'), false);
  assert.equal(first.querySelector('button'), null);
  await act(async () => second.hidePopover());
  assert.equal(menu(), null);
  await act(async () => context(rows[0]));
  await act(async () => element('[role="menuitem"]').click());
  assert.equal(menu(), null);
  assert.equal(document.activeElement, rows[0]);
  await act(async () => context(rows[0]));
  await act(async () => closeChatActionMenus());
  assert.equal(menu(), null);
});

test('copy failure stays recoverable while success closes the menu after copying the whole message', async () => {
  let fail = true;
  let copied = '';
  Object.defineProperty(browser.window.navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: async (value: string) => {
        if (fail) throw new Error('Denied');
        copied = value;
      },
    },
  });
  await act(async () => browser.root.render(localized(<Timeline />)));
  await act(async () => context(element('[data-chat-message]')));
  await act(async () => element('[role="menuitem"]').click());
  assert.ok(menu()?.textContent?.includes('复制失败'));
  fail = false;
  await act(async () => element('[role="menuitem"]').click());
  assert.equal(copied, 'Hello example.com');
  assert.equal(menu(), null);
});

test('an unfinished copy cannot steal focus after its menu has been dismissed', async () => {
  let finish: (() => void) | undefined;
  Object.defineProperty(browser.window.navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    },
  });
  await act(async () =>
    browser.root.render(
      localized(
        <>
          <Timeline />
          <button type="button" data-outside>
            Outside
          </button>
        </>,
      ),
    ),
  );
  await act(async () => context(element('[data-chat-message]')));
  await act(async () => element('[role="menuitem"]').click());
  const outside = element('[data-outside]');
  await act(async () => {
    pointer(outside, 'pointerdown');
    outside.focus();
  });
  assert.equal(menu(), null);
  await act(async () => finish?.());
  assert.equal(document.activeElement, outside);
});
