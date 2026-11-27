import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { PageCommand, WorkerUpdate } from '@/modules/chat/lib/connection/chat-port';
import { createPageChat } from '@/modules/chat/lib/connection/shared-chat-client';
import type { ChatHistoryPage } from '@/modules/chat/lib/connection/chat-session';
import { message, OWNER } from './fixtures';

test('the shared chat client reads history and persists live messages without Promise.withResolvers', async () => {
  const commands: PageCommand[] = [];
  const port = Object.assign(new EventTarget(), {
    onmessage: null as ((event: MessageEvent<WorkerUpdate>) => void) | null,
    postMessage(command: PageCommand) { commands.push(command); },
    close() {},
  });
  class Worker {
    readonly port = port;
  }
  const scope = 'a'.repeat(43);
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const workerDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'SharedWorker');
  const promiseDescriptor = Object.getOwnPropertyDescriptor(Promise, 'withResolvers')!;
  Object.defineProperty(globalThis, 'window', { configurable: true, value: new EventTarget() });
  Object.defineProperty(globalThis, 'SharedWorker', { configurable: true, value: Worker });
  Object.defineProperty(Promise, 'withResolvers', { ...promiseDescriptor, value: undefined });

  const tab = createPageChat(OWNER, scope, {
    onConnection() {}, onEvent() {}, onDisconnect() {}, onRefreshAccount() {}, onDeliveryTimeout() {},
  });
  const update = (data: WorkerUpdate) => {
    assert.ok(port.onmessage);
    port.onmessage(new MessageEvent('message', { data }));
  };
  try {
    tab.retry();
    assert.deepEqual(commands.shift(), { type: 'attach', owner: OWNER, scope });
    update({ type: 'connection', state: { status: 'online' } });
    update({ type: 'event', event: { type: 'permissions', staff: false } });
    update({ type: 'lease', deadline: Date.now() + 60_000 });

    const pending = tab.readHistory({ channel: 'public' });
    const read = commands.shift();
    assert.equal(read?.type, 'read');
    const page: ChatHistoryPage = {
      type: 'history', requestId: 'history-request', channel: 'public', messages: [], reset: false,
    };
    update({ type: 'page', id: read.id, index: 0, page });
    assert.deepEqual(await pending, page);

    const record = message();
    assert.ok(tab.persistLive);
    const save = tab.persistLive({ owner: OWNER, epoch: 'test-epoch', persist: true }, record);
    const write = commands.shift();
    assert.equal(write?.type, 'persist');
    update({ type: 'stored', id: write.id, saved: true });
    assert.equal(await save, true);
  } finally {
    tab.stop();
    Object.defineProperty(Promise, 'withResolvers', promiseDescriptor);
    if (workerDescriptor) Object.defineProperty(globalThis, 'SharedWorker', workerDescriptor);
    else Reflect.deleteProperty(globalThis, 'SharedWorker');
    if (windowDescriptor) Object.defineProperty(globalThis, 'window', windowDescriptor);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});

test('a tab keeps a responsive shared worker and redials locally when it stops answering during reconnect', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 0 });
  const commands: PageCommand[] = [];
  let portClosed = false;
  let dials = 0;
  const port = Object.assign(new EventTarget(), {
    onmessage: null as ((event: MessageEvent<WorkerUpdate>) => void) | null,
    postMessage(command: PageCommand) {
      commands.push(command);
    },
    close() {
      portClosed = true;
    },
  });
  const globals = {
    window: new EventTarget(),
    SharedWorker: class {
      readonly port = port;
    },
    WebSocket: class {
      constructor() {
        dials++;
      }
      close() {}
    },
  };
  for (const [key, value] of Object.entries(globals)) {
    const original = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, value });
    t.after(() => {
      if (original) Object.defineProperty(globalThis, key, original);
      else Reflect.deleteProperty(globalThis, key);
    });
  }
  const key = 'NEXT_PUBLIC_WEB_CHAT_PUBLIC_KEY';
  const original = process.env[key];
  process.env[key] = Buffer.alloc(65).toString('base64url');
  const states: string[] = [];
  const tab = createPageChat(OWNER, 'a'.repeat(43), {
    onConnection(state) {
      states.push(state.status);
    },
    onDisconnect() {},
    onEvent() {},
    onRefreshAccount() {},
    onDeliveryTimeout() {},
  });
  t.after(() => {
    tab.stop();
    if (original === undefined) delete process.env[key];
    else process.env[key] = original;
    t.mock.timers.reset();
  });

  tab.retry();
  const update = port.onmessage!;
  update(
    new MessageEvent('message', {
      data: { type: 'connection', state: { status: 'reconnecting' } },
    }),
  );
  t.mock.timers.tick(15_000);
  assert.deepEqual(commands.at(-1), { type: 'probe' });
  update(new MessageEvent('message', { data: { type: 'probe' } }));
  t.mock.timers.tick(15_000);
  assert.equal(dials, 0);
  assert.deepEqual(commands.at(-1), { type: 'probe' });

  t.mock.timers.tick(5000);
  assert.equal(portClosed, true);
  assert.equal(dials, 1);
  assert.equal(states.at(-1), 'connecting');
  update(
    new MessageEvent('message', { data: { type: 'connection', state: { status: 'online' } } }),
  );
  assert.equal(states.at(-1), 'connecting');
  tab.stop();
  t.mock.timers.tick(60_000);
  assert.equal(dials, 1);
});
