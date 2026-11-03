import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { NextIntlClientProvider } from 'next-intl';
import { act, useRef, useState } from 'react';
import type { ChatInputHistoryEntry } from '@/modules/chat/model/chat-input-history';
import type { ChatPeer } from '@/modules/chat/model/chat-protocol';
import { ChatMentionInput } from '@/modules/chat/ui/chat-mention-input';
import translations from '../../messages/zh-CN.json';
import { OTHER, PEER } from '../chat/fixtures';
import { createBrowserEnvironment } from '../support/browser-environment';

let browser: ReturnType<typeof createBrowserEnvironment>;
beforeEach(() => {
  browser = createBrowserEnvironment();
});
afterEach(async () => browser.close());

const history = [
  { id: 'old', text: 'Older message' },
  { id: 'new', text: 'Newer message' },
];
const peers: ChatPeer[] = [
  { playerUuid: PEER, name: 'Alex', game: true, webConnections: 0 },
  { playerUuid: OTHER, name: 'Ada', game: false, webConnections: 1 },
];

function Input({
  entries = history,
  initialValue = '',
}: {
  entries?: ChatInputHistoryEntry[];
  initialValue?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initialValue);
  return (
    <NextIntlClientProvider locale="zh-CN" timeZone="Asia/Singapore" messages={translations}>
      <label htmlFor="message">Message</label>
      <ChatMentionInput
        id="message"
        inputRef={ref}
        value={value}
        onChange={setValue}
        history={entries}
        peers={peers}
        enabled
        placeholder="Message…"
      />
    </NextIntlClientProvider>
  );
}

async function mount(initialValue = '', entries = history) {
  await act(async () =>
    browser.root.render(<Input initialValue={initialValue} entries={entries} />),
  );
  const input = document.querySelector('input');
  assert.ok(input);
  await act(async () => input.focus());
  return input;
}

async function key(
  input: HTMLInputElement,
  value: string,
  options: {
    shiftKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    altKey?: boolean;
    isComposing?: boolean;
    keyCode?: number;
  } = {},
) {
  const event = new browser.window.KeyboardEvent('keydown', {
    key: value,
    bubbles: true,
    cancelable: true,
    ...options,
  });
  await act(async () => Reflect.apply(input.dispatchEvent, input, [event]));
  return event;
}

async function edit(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    browser.window.HTMLInputElement.prototype,
    'value',
  )?.set;
  assert.ok(setter);
  await act(async () => {
    setter.call(input, value);
    input.setSelectionRange(value.length, value.length);
    Reflect.apply(input.dispatchEvent, input, [
      new browser.window.InputEvent('input', { bubbles: true }),
    ]);
  });
}

test('an empty composer browses older/newer sent messages, stops at the oldest and returns to empty', async () => {
  const input = await mount();
  assert.equal((await key(input, 'ArrowDown')).defaultPrevented, false);
  assert.equal((await key(input, 'ArrowUp')).defaultPrevented, true);
  assert.equal(input.value, 'Newer message');
  assert.equal(input.selectionStart, input.value.length);
  assert.equal(input.selectionEnd, input.value.length);
  await key(input, 'ArrowUp');
  assert.equal(input.value, 'Older message');
  await key(input, 'ArrowUp');
  assert.equal(input.value, 'Older message');
  await key(input, 'ArrowDown');
  assert.equal(input.value, 'Newer message');
  await key(input, 'ArrowDown');
  assert.equal(input.value, '');
  assert.equal((await key(input, 'ArrowDown')).defaultPrevented, false);
});

test('existing and edited drafts keep normal arrow behavior, even when edited back to a history value', async () => {
  const input = await mount('Unsent draft');
  assert.equal((await key(input, 'ArrowUp')).defaultPrevented, false);
  assert.equal(input.value, 'Unsent draft');
  await edit(input, '');
  await key(input, 'ArrowUp');
  assert.equal(input.value, 'Newer message');
  await edit(input, 'Newer message!');
  assert.equal((await key(input, 'ArrowUp')).defaultPrevented, false);
  assert.equal(input.value, 'Newer message!');
  await edit(input, 'Newer message');
  assert.equal((await key(input, 'ArrowUp')).defaultPrevented, false);
  assert.equal(input.value, 'Newer message');
});

test('modifiers and IME composition never trigger history recall', async () => {
  const input = await mount();
  for (const options of [
    { shiftKey: true },
    { ctrlKey: true },
    { metaKey: true },
    { altKey: true },
    { isComposing: true },
    { keyCode: 229 },
  ]) {
    assert.equal((await key(input, 'ArrowUp', options)).defaultPrevented, false);
    assert.equal(input.value, '');
  }
  assert.equal((await key(input, 'Enter', { isComposing: true })).defaultPrevented, true);
  await key(input, 'ArrowUp');
  assert.equal(input.value, 'Newer message');
});

test('recalled mentions stay in history mode while typed mentions retain their candidate navigation', async () => {
  const input = await mount('', [...history, { id: 'mention', text: 'Hello @Alex' }]);
  await key(input, 'ArrowUp');
  assert.equal(input.value, 'Hello @Alex');
  assert.equal(input.getAttribute('aria-expanded'), 'false');
  await key(input, 'ArrowUp');
  assert.equal(input.value, 'Newer message');
  await edit(input, '@');
  assert.equal(input.getAttribute('aria-expanded'), 'true');
  const first = input.getAttribute('aria-activedescendant');
  await key(input, 'ArrowDown');
  assert.notEqual(input.getAttribute('aria-activedescendant'), first);
  assert.equal(input.value, '@');
  await key(input, 'ArrowUp');
  assert.equal(input.getAttribute('aria-activedescendant'), first);
});

test('new arrivals preserve the current history cursor and cleared records cannot be recalled again', async () => {
  const input = await mount();
  await key(input, 'ArrowUp');
  const updated = [...history, { id: 'arrived', text: 'Just arrived' }];
  await act(async () => browser.root.render(<Input entries={updated} />));
  await key(input, 'ArrowUp');
  assert.equal(input.value, 'Older message');
  await key(input, 'ArrowDown');
  assert.equal(input.value, 'Newer message');
  await key(input, 'ArrowDown');
  assert.equal(input.value, '');
  await key(input, 'ArrowUp');
  assert.equal(input.value, 'Just arrived');
  await act(async () => browser.root.render(<Input entries={[]} />));
  assert.equal((await key(input, 'ArrowUp')).defaultPrevented, false);
  assert.equal(input.value, 'Just arrived');
  await edit(input, '');
  assert.equal((await key(input, 'ArrowUp')).defaultPrevented, false);
  assert.equal(input.value, '');
});
