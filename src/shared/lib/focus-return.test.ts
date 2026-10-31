import assert from 'node:assert/strict';
import { getEventListeners } from 'node:events';
import { afterEach, test } from 'node:test';
import { captureFocusReturn } from '@/shared/lib/focus-return';

const documents: EventTarget[] = [];

function opener(focusVisible = false) {
  const document = new EventTarget();
  documents.push(document);
  const attributes = new Map<string, string>();
  let focusCalls = 0;
  let visible = focusVisible;
  const element = Object.assign(new EventTarget(), {
    ownerDocument: document,
    isConnected: true,
    matches: () => visible,
    setAttribute: (name: string, value: string) => attributes.set(name, value),
    getAttribute: (name: string) => attributes.get(name) ?? null,
    removeAttribute: (name: string) => attributes.delete(name),
    focus: (options: FocusOptions) => {
      assert.equal(options.preventScroll, true);
      focusCalls++;
    },
  });
  return {
    element: element as unknown as HTMLElement,
    document,
    attributes,
    focusCalls: () => focusCalls,
    setFocusVisible: (value: boolean) => {
      visible = value;
    },
  };
}

function key(document: EventTarget, value: string) {
  document.dispatchEvent(Object.assign(new Event('keydown'), { key: value }));
}

afterEach(() => {
  for (const document of documents) document.dispatchEvent(new Event('pointerdown'));
  documents.length = 0;
});

test('pointer opening followed by Escape restores focus without a lingering outline', () => {
  const target = opener();
  const focusReturn = captureFocusReturn(target.element);
  key(target.document, 'Escape');
  focusReturn.restore();
  assert.equal(target.focusCalls(), 1);
  assert.equal(target.attributes.get('data-restored-focus'), 'quiet');
  key(target.document, 'Escape');
  assert.equal(target.attributes.get('data-restored-focus'), 'quiet');
});

test('keyboard-opened dialogs retain their focus indicator after Escape', () => {
  const target = opener(true);
  const focusReturn = captureFocusReturn(target.element);
  key(target.document, 'Escape');
  focusReturn.restore();
  assert.equal(target.focusCalls(), 1);
  assert.equal(target.attributes.has('data-restored-focus'), false);
});

test('effect replay does not mistake a quiet programmatic return for keyboard opening', () => {
  const target = opener();
  captureFocusReturn(target.element).restore();
  target.setFocusVisible(true);
  const focusReturn = captureFocusReturn(target.element);
  key(target.document, 'Escape');
  focusReturn.restore();
  assert.equal(target.attributes.get('data-restored-focus'), 'quiet');
});

test('Tab or arrow navigation inside a pointer-opened dialog restores visible focus', () => {
  for (const navigationKey of ['Tab', 'ArrowRight']) {
    const target = opener();
    const focusReturn = captureFocusReturn(target.element);
    key(target.document, navigationKey);
    key(target.document, 'Escape');
    focusReturn.restore();
    assert.equal(target.attributes.has('data-restored-focus'), false);
  }
});

test('the next Tab, pointer action or blur releases the temporary marker and listeners', () => {
  for (const action of ['Tab', 'pointerdown', 'blur']) {
    const target = opener();
    captureFocusReturn(target.element).restore();
    if (action === 'Tab') key(target.document, 'Tab');
    else if (action === 'blur') target.element.dispatchEvent(new Event('blur'));
    else target.document.dispatchEvent(new Event('pointerdown'));
    assert.equal(target.attributes.has('data-restored-focus'), false);
    assert.equal(getEventListeners(target.document, 'keydown').length, 0);
    assert.equal(getEventListeners(target.document, 'pointerdown').length, 0);
  }
});

test('returning to another opener clears the previous marker', () => {
  const first = opener();
  const second = opener();
  captureFocusReturn(first.element).restore();
  captureFocusReturn(second.element).restore();
  assert.equal(first.attributes.has('data-restored-focus'), false);
  assert.equal(second.attributes.get('data-restored-focus'), 'quiet');
});

test('responsive layouts can return focus to a replacement control', () => {
  const original = opener();
  const replacement = opener();
  const focusReturn = captureFocusReturn(original.element);
  focusReturn.restore(replacement.element);
  assert.equal(original.focusCalls(), 0);
  assert.equal(replacement.focusCalls(), 1);
  assert.equal(replacement.attributes.get('data-restored-focus'), 'quiet');
});

test('discarded or disconnected openers do not retain tracking or steal focus', () => {
  const target = opener();
  const focusReturn = captureFocusReturn(target.element);
  focusReturn.dispose();
  assert.equal(getEventListeners(target.document, 'keydown').length, 0);
  Object.defineProperty(target.element, 'isConnected', { value: false });
  focusReturn.restore();
  assert.equal(target.focusCalls(), 0);
  assert.equal(target.attributes.has('data-restored-focus'), false);
  captureFocusReturn(null).restore();
});
