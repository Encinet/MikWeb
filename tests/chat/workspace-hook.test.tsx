import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { Window } from 'happy-dom';
import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import type { HistoryLease } from '@/modules/chat/lib/chat-history';
import {
  loadChatWorkspace,
  resetHistory,
  saveChatWorkspace,
  setStaffHistoryPermission,
  syncHistoryAccount,
} from '@/modules/chat/lib/chat-history';
import { useChatWorkspace } from '@/modules/chat/model/use-chat-workspace';
import { OWNER, PEER } from './fixtures';

let environment: Window;
let root: Root;
let container: HTMLElement;
let current: ReturnType<typeof useChatWorkspace> | null;
let previousGlobals: Map<string, PropertyDescriptor | undefined>;

function Harness({ lease, staff = false }: { lease: HistoryLease; staff?: boolean }) {
  current = useChatWorkspace(lease, staff);
  return <output>{JSON.stringify(current.workspace)}</output>;
}

function state() {
  assert.ok(current);
  return current;
}

async function until(check: () => boolean) {
  for (let attempt = 0; attempt < 100 && !check(); attempt++) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
    });
  }
  assert.ok(check(), 'The workspace did not settle');
}

beforeEach(async () => {
  environment = new Window({ url: 'http://localhost:3000/zh-CN/chat' });
  previousGlobals = new Map();
  const globals: [string, unknown][] = [
    ['window', environment],
    ['document', environment.document],
    ['navigator', environment.navigator],
    ['HTMLElement', environment.HTMLElement],
    ['Node', environment.Node],
    ['Event', environment.Event],
    ['EventTarget', environment.EventTarget],
    ['CustomEvent', environment.CustomEvent],
    ['HTMLSelectElement', environment.HTMLSelectElement],
    ['ResizeObserver', environment.ResizeObserver],
    ['IS_REACT_ACT_ENVIRONMENT', true],
  ];
  for (const [key, value] of globals) {
    previousGlobals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  current = null;
  await syncHistoryAccount(null);
});

afterEach(async () => {
  await act(async () => root.unmount());
  await environment.happyDOM.close();
  for (const [key, descriptor] of previousGlobals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
});

test('rapid edits are saved in order and restored by a fresh hook instance', async () => {
  const lease = await syncHistoryAccount(OWNER);
  await act(async () => root.render(<Harness lease={lease} />));
  await act(async () => {
    for (const text of ['H', 'He', 'Hello'])
      state().mutate({ type: 'draft', key: 'public', text, at: Date.now() });
    state().mutate({ type: 'preferences', value: { density: 'compact' } });
  });
  await until(
    () =>
      state().workspace.drafts.public?.text === 'Hello' &&
      state().workspace.preferences.density === 'compact',
  );
  await until(() => !state().storageFailed);
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 40));
  });
  assert.equal((await loadChatWorkspace(lease))?.drafts.public.text, 'Hello');
  assert.equal(state().getDraft('public'), 'Hello');
  await act(async () => root.render(<Harness key="fresh" lease={lease} />));
  await until(() => state().workspace.drafts.public?.text === 'Hello');
  assert.equal(state().restoredCount, 1);
});

test('a failed storage write keeps the new draft visible and retrying preserves the latest edit', async () => {
  const lease = await syncHistoryAccount(OWNER);
  await saveChatWorkspace(lease, {
    type: 'draft',
    key: 'public',
    text: 'Old draft',
    at: Date.now(),
  });
  await act(async () => root.render(<Harness lease={lease} />));
  await until(() => state().workspace.drafts.public?.text === 'Old draft');
  const original = IDBDatabase.prototype.transaction;
  let fail = true;
  let successfulWrites = 0;
  Object.defineProperty(IDBDatabase.prototype, 'transaction', {
    configurable: true,
    writable: true,
    value: function (this: IDBDatabase, stores: string[], mode: IDBTransactionMode) {
      if (fail && mode === 'readwrite') throw new Error('Storage is full');
      if (mode === 'readwrite') successfulWrites++;
      return Reflect.apply(original, this, [stores, mode]);
    },
  });
  try {
    await act(async () =>
      state().mutate({ type: 'draft', key: 'public', text: 'Unsaved new draft', at: Date.now() }),
    );
    await until(() => state().storageFailed);
    await act(async () => {
      window.dispatchEvent(new Event('mik-chat-workspace-change'));
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    assert.equal(state().workspace.drafts.public.text, 'Unsaved new draft');
    assert.equal(state().storageFailed, true);
    await act(async () => {
      for (let index = 0; index < 200; index++) {
        state().mutate({ type: 'draft', key: 'public', text: `Unsaved ${index}`, at: Date.now() });
        state().mutate({ type: 'preferences', value: { density: 'compact' } });
      }
      state().mutate({ type: 'draft', key: `private:${PEER}`, text: 'Private', at: Date.now() });
    });
    fail = false;
    await act(async () =>
      state().mutate({ type: 'draft', key: 'public', text: 'Latest draft', at: Date.now() }),
    );
    await until(() => !state().storageFailed);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    const restored = await loadChatWorkspace(lease);
    assert.equal(restored?.drafts.public.text, 'Latest draft');
    assert.equal(restored?.drafts[`private:${PEER}`].text, 'Private');
    assert.equal(restored?.preferences.density, 'compact');
    assert.ok(successfulWrites <= 3, `Recovered with ${successfulWrites} writes`);
  } finally {
    Object.defineProperty(IDBDatabase.prototype, 'transaction', {
      configurable: true,
      writable: true,
      value: original,
    });
  }
});

test('permission loss removes staff drafts from stable getters and stale edit callbacks', async () => {
  const lease = await syncHistoryAccount(OWNER);
  await setStaffHistoryPermission(OWNER, true);
  await saveChatWorkspace(lease, {
    type: 'draft',
    key: 'staff',
    text: 'Staff only',
    at: Date.now(),
  });
  await act(async () => root.render(<Harness lease={lease} staff />));
  await until(() => state().getDraft('staff') === 'Staff only');
  const previous = state();
  await act(async () => root.render(<Harness lease={lease} staff={false} />));
  assert.equal(previous.getDraft('staff'), '');
  await act(async () =>
    previous.mutate({ type: 'draft', key: 'staff', text: 'Stale staff edit', at: Date.now() }),
  );
  assert.equal(state().getDraft('staff'), '');
  assert.equal(state().workspace.drafts.staff, undefined);
  await act(async () => {
    assert.equal((await loadChatWorkspace(lease))?.drafts.staff.text, 'Staff only');
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
});

test('staff drafts waiting on a failed write are discarded when permission is lost', async () => {
  const lease = await syncHistoryAccount(OWNER);
  await setStaffHistoryPermission(OWNER, true);
  await act(async () => root.render(<Harness lease={lease} staff />));
  const original = IDBDatabase.prototype.transaction;
  let fail = true;
  Object.defineProperty(IDBDatabase.prototype, 'transaction', {
    configurable: true,
    writable: true,
    value: function (this: IDBDatabase, stores: string[], mode: IDBTransactionMode) {
      if (fail && mode === 'readwrite') throw new Error('Storage is full');
      return Reflect.apply(original, this, [stores, mode]);
    },
  });
  try {
    await act(async () =>
      state().mutate({ type: 'draft', key: 'staff', text: 'Do not resurrect', at: Date.now() }),
    );
    await until(() => state().storageFailed);
    await act(async () => root.render(<Harness lease={lease} staff={false} />));
    fail = false;
    await act(async () => root.render(<Harness lease={lease} staff />));
    await act(async () =>
      state().mutate({ type: 'draft', key: 'public', text: 'Public', at: Date.now() }),
    );
    await until(() => !state().storageFailed);
    assert.equal(state().getDraft('staff'), '');
    assert.equal((await loadChatWorkspace(lease))?.drafts.staff, undefined);
  } finally {
    Object.defineProperty(IDBDatabase.prototype, 'transaction', {
      configurable: true,
      writable: true,
      value: original,
    });
  }
});

test('clearing records in another tab immediately clears the hook when the epoch changes', async () => {
  const lease = await syncHistoryAccount(OWNER);
  await saveChatWorkspace(lease, {
    type: 'draft',
    key: 'public',
    text: 'Clear me',
    at: Date.now(),
  });
  await act(async () => root.render(<Harness lease={lease} />));
  await until(() => Boolean(state().workspace.drafts.public));
  const next = await resetHistory(OWNER);
  assert.ok(next);
  const previousMutate = state().mutate;
  await act(async () => root.render(<Harness lease={next} />));
  await act(async () =>
    previousMutate({ type: 'draft', key: 'public', text: 'Stale edit', at: Date.now() }),
  );
  assert.deepEqual(state().workspace.drafts, {});
  assert.equal(state().getDraft('public'), '');
});

test('unsaved in-memory drafts survive preference writes while saving is disabled', async () => {
  await syncHistoryAccount(OWNER);
  const lease = await resetHistory(OWNER, false);
  assert.ok(lease);
  await act(async () => root.render(<Harness lease={lease} />));
  await act(async () => {
    state().mutate({ type: 'draft', key: 'public', text: 'Memory only', at: Date.now() });
    state().mutate({ type: 'preferences', value: { membersVisible: false } });
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 30));
  });
  assert.equal(state().workspace.drafts.public.text, 'Memory only');
  assert.deepEqual((await loadChatWorkspace(lease))?.drafts, {});
  assert.equal((await loadChatWorkspace(lease))?.preferences.membersVisible, false);
});
