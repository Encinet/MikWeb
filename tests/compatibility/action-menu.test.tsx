import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { act } from 'react';
import { closeChatActionMenus } from '@/modules/chat/lib/chat-action-menu-events';
import { ChatActionMenu } from '@/modules/chat/ui/chat-action-menu';
import { createBrowserEnvironment } from '../support/browser-environment';

let browser: ReturnType<typeof createBrowserEnvironment>;

function trigger(label: string) {
  const element = document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  assert.ok(element);
  return element;
}

function press(element: HTMLElement, key: string, shiftKey = false) {
  Reflect.apply(element.dispatchEvent, element, [
    new browser.window.KeyboardEvent('keydown', { key, shiftKey, bubbles: true }),
  ]);
}

beforeEach(() => {
  browser = createBrowserEnvironment();
  const prototype = browser.window.HTMLElement.prototype;
  Object.defineProperty(prototype, 'showPopover', { configurable: true, value: undefined });
  Object.defineProperty(prototype, 'hidePopover', { configurable: true, value: undefined });
  const matches = prototype.matches;
  prototype.matches = function (selector: string) {
    assert.ok(
      !selector.includes(':popover-open'),
      'Unsupported popover selectors must not be evaluated',
    );
    return matches.call(this, selector);
  };
});

afterEach(async () => browser.close());

test('missing Popover APIs preserve opening, keyboard navigation, activation, and focus return', async () => {
  let chosen = false;
  await act(async () =>
    browser.root.render(
      <ChatActionMenu label="Actions">
        <button type="button">Copy</button>
        <select disabled aria-label="Unavailable">
          <option>Loading</option>
        </select>
        <button
          type="button"
          data-chat-menu-close
          onClick={() => {
            chosen = true;
          }}
        >
          Mention
        </button>
      </ChatActionMenu>,
    ),
  );
  const opener = trigger('Actions');
  await act(async () => press(opener, 'ArrowDown'));
  const surface = document.querySelector<HTMLElement>('[data-chat-menu-open]');
  assert.ok(surface);
  assert.equal(surface.parentElement, document.body);
  assert.equal(opener.getAttribute('aria-expanded'), 'true');
  assert.equal(surface.getAttribute('role'), 'dialog');
  const controls = surface.querySelectorAll<HTMLButtonElement>('button');
  assert.equal(document.activeElement, controls[0]);
  await act(async () => press(controls[0], 'ArrowDown'));
  assert.equal(document.activeElement, controls[1]);
  await act(async () => controls[1].click());
  assert.equal(chosen, true);
  assert.equal(document.activeElement, opener);
  assert.equal(document.querySelector('[data-chat-menu-open]'), null);
  await act(async () => opener.click());
  assert.ok(document.querySelector('[data-chat-menu-open]'));
  await act(async () => press(document.activeElement as HTMLElement, 'Escape'));
  assert.equal(document.activeElement, opener);
  assert.equal(opener.getAttribute('aria-expanded'), 'false');
});

test('fallback menus dismiss outside, close before another surface opens, and stay open for inner clicks', async () => {
  await act(async () =>
    browser.root.render(
      <>
        <ChatActionMenu label="First">
          <button type="button">Copy</button>
        </ChatActionMenu>
        <ChatActionMenu label="Second">
          <button type="button">Other</button>
        </ChatActionMenu>
      </>,
    ),
  );
  await act(async () => trigger('First').click());
  const inner = document.querySelector<HTMLElement>('[data-chat-menu-open] button');
  assert.ok(inner);
  await act(async () =>
    Reflect.apply(inner.dispatchEvent, inner, [
      new browser.window.PointerEvent('pointerdown', { bubbles: true }),
    ]),
  );
  assert.equal(trigger('First').getAttribute('aria-expanded'), 'true');
  await act(async () => trigger('Second').click());
  assert.equal(trigger('First').getAttribute('aria-expanded'), 'false');
  assert.equal(trigger('Second').getAttribute('aria-expanded'), 'true');
  assert.equal(document.querySelectorAll('[data-chat-menu-open]').length, 1);
  await act(async () => closeChatActionMenus());
  assert.equal(document.querySelector('[data-chat-menu-open]'), null);
  await act(async () => trigger('First').click());
  await act(async () =>
    Reflect.apply(document.body.dispatchEvent, document.body, [
      new browser.window.PointerEvent('pointerdown', { bubbles: true }),
    ]),
  );
  assert.equal(trigger('First').getAttribute('aria-expanded'), 'false');
});

test('fallback portals remain inside their owning dialog and restore its tab order', async () => {
  await act(async () =>
    browser.root.render(
      <dialog open aria-label="Conversations">
        <ChatActionMenu label="Thread actions">
          <button type="button">Pin</button>
          <button type="button">Close</button>
        </ChatActionMenu>
        <button type="button" data-after-menu>
          Next conversation
        </button>
      </dialog>,
    ),
  );
  const opener = trigger('Thread actions');
  const following = document.querySelector<HTMLButtonElement>('[data-after-menu]');
  assert.ok(following);
  Object.defineProperty(following, 'getClientRects', {
    value: () => [new browser.window.DOMRect()],
  });
  await act(async () => opener.click());
  const surface = document.querySelector<HTMLElement>('[data-chat-menu-open]');
  assert.ok(surface);
  assert.equal(surface.parentElement, browser.container.querySelector('dialog'));
  const controls = surface.querySelectorAll<HTMLButtonElement>('button');
  await act(async () => press(controls[0], 'Tab'));
  assert.equal(opener.getAttribute('aria-expanded'), 'true');
  await act(async () => press(controls[1], 'Tab'));
  assert.equal(opener.getAttribute('aria-expanded'), 'false');
  assert.equal(document.activeElement, following);
  await act(async () => opener.click());
  const first = document.querySelector<HTMLElement>('[data-chat-menu-open] button');
  assert.ok(first);
  await act(async () => press(first, 'Tab', true));
  assert.equal(document.activeElement, opener);
});

test('fallback positioning uses the visual viewport and all four safe area insets', async () => {
  const viewport = Object.assign(new browser.window.EventTarget(), {
    width: 844,
    height: 390,
    offsetLeft: 0,
    offsetTop: 0,
    scale: 1,
  });
  Object.defineProperty(browser.window, 'visualViewport', { configurable: true, value: viewport });
  for (const [side, inset] of Object.entries({ top: 0, right: 44, bottom: 21, left: 44 }))
    document.documentElement.style.setProperty(`--viewport-${side}-inset`, `${inset}px`);
  await act(async () =>
    browser.root.render(
      <ChatActionMenu label="Positioned">
        <button type="button">Copy</button>
      </ChatActionMenu>,
    ),
  );
  const opener = trigger('Positioned');
  Object.defineProperty(opener, 'getBoundingClientRect', {
    value: () => ({ top: 350, bottom: 390, right: 840 }),
  });
  await act(async () => opener.click());
  const surface = document.querySelector<HTMLElement>('[data-chat-menu-open]');
  assert.ok(surface);
  Object.defineProperties(surface, { offsetWidth: { value: 200 }, offsetHeight: { value: 160 } });
  await act(async () => browser.window.dispatchEvent(new browser.window.Event('resize')));
  assert.equal(surface.style.getPropertyValue('--chat-menu-viewport-width'), '756px');
  assert.equal(surface.style.getPropertyValue('--chat-menu-viewport-height'), '369px');
  assert.equal(surface.style.left, '592px');
  assert.equal(surface.style.top, '186px');
  viewport.height = 240;
  viewport.offsetTop = 80;
  await act(async () => viewport.dispatchEvent(new browser.window.Event('resize')));
  assert.equal(surface.style.top, '131px');
  assert.equal(surface.style.getPropertyValue('--chat-menu-viewport-height'), '219px');
});
