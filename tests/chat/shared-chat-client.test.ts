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
