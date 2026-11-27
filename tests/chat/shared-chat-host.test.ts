import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { PageCommand, WorkerUpdate } from '@/modules/chat/lib/connection/chat-port';
import type {
  ChatHistoryPage,
  ChatSessionEvent,
  ChatSessionObserver,
} from '@/modules/chat/lib/connection/chat-session';
import { SharedChatHost } from '@/modules/chat/lib/connection/shared-chat-host';

import { loadHistory, syncHistoryAccount } from '@/modules/chat/lib/history/chat-history';
import { openChatHistoryDatabase, deleteChatHistoryDatabase } from '@/modules/chat/lib/history/chat-history-database';
import { mayReadMessage } from '@/modules/chat/model/chat-protocol';
import { message, OWNER, PEER } from './fixtures';

const scope = 'a'.repeat(43);

function fixture() {
  const sessions: {
    owner: string;
    scope: string;
    observer: ChatSessionObserver;
    stopped: boolean;
    staff: boolean;
  }[] = [];
  const reads: { resolve(page: ChatHistoryPage): void; signal?: AbortSignal }[] = [];
  const host = new SharedChatHost((owner, scope, observer) => {
    const session = { owner, scope, observer, staff: true, stopped: false };
    sessions.push(session);
    return {
      get access() {
        return { owner, staff: session.staff };
      },
      get accessDeadline() {
        return Date.now() + 60_000;
      },
      accessFor: record => mayReadMessage(record, owner, session.staff) ? { owner, staff: session.staff } : null,
      retry: () => observer.onConnection({ status: 'online' }),
      recover() {},
      stop: () => {
        session.stopped = true;
      },
      send: () => ({ ok: false }),
      readHistories: (queries, signal) =>
        queries.map(
          () =>
            new Promise<ChatHistoryPage>((resolve, reject) => {
              reads.push({ resolve, signal });
              signal?.addEventListener('abort', () => reject(new Error('cancelled')), {
                once: true,
              });
            }),
        ),
    };
  });
  return { host, sessions, reads };
}

function tab(host: SharedChatHost) {
  const { port1, port2 } = new MessageChannel();
  const updates: WorkerUpdate[] = [];
  host.listen(port1);
  port2.onmessage = ({ data }: MessageEvent<WorkerUpdate | 'drained'>) => {
    if (data !== 'drained') updates.push(data);
  };
  return {
    updates,
    async command(command: PageCommand) {
      const handled = new Promise<void>((resolve) =>
        port1.addEventListener('message', () => resolve(), { once: true }),
      );
      port2.postMessage(command);
      await handled;
    },
    async drain() {
      // A marker follows every response already enqueued by the host on this port.
      const delivered = new Promise<void>((resolve) => {
        const onMessage = ({ data }: MessageEvent) => {
          if (data !== 'drained') return;
          port2.removeEventListener('message', onMessage);
          resolve();
        };
        port2.addEventListener('message', onMessage);
      });
      port1.postMessage('drained');
      await delivered;
    },
    next() {
      return new Promise<WorkerUpdate>((resolve) =>
        port2.addEventListener('message', (event) => resolve(event.data), { once: true }),
      );
    },
    close() {
      port1.close();
      port2.close();
    },
  };
}

function page(channel: 'public' | 'staff'): ChatHistoryPage {
  return {
    type: 'history',
    channel,
    requestId: 'history-request',
    messages: [],
    reset: false,
    checkpoint: 'x'.repeat(91),
  };
}

test('two pages share a history read and release it only after its last subscriber leaves', async () => {
  const { host, reads, sessions } = fixture();
  const first = tab(host),
    second = tab(host);
  try {
    for (const view of [first, second]) await view.command({ type: 'attach', owner: OWNER, scope });
    assert.equal(sessions.length, 1);
    const probe = first.next();
    await first.command({ type: 'probe' });
    assert.deepEqual(await probe, { type: 'probe' });
    const read: PageCommand = { type: 'read', id: 1, queries: [{ channel: 'public' }] };
    for (const view of [first, second]) await view.command(read);
    assert.equal(reads.length, 1);
    await first.command({ type: 'cancel', id: 1 });
    assert.equal(reads[0].signal?.aborted, false);
    const response = page('public');
    reads[0].resolve(response);
    await Promise.resolve();
    await Promise.all([first.drain(), second.drain()]);
    assert.deepEqual(
      first.updates.filter((x) => x.type === 'page'),
      [],
    );
    assert.deepEqual(
      second.updates.filter((x) => x.type === 'page'),
      [{ type: 'page', id: 1, index: 0, page: response, error: undefined }],
    );

    for (const view of [first, second]) await view.command({ ...read, id: 2 });
    assert.equal(reads.length, 2);
    await first.command({ type: 'detach' });
    assert.equal(reads[1].signal?.aborted, false);
    assert.equal(sessions[0].stopped, false);
    await second.command({ type: 'detach' });
    assert.equal(reads[1].signal?.aborted, true);
    assert.equal(sessions[0].stopped, true);
  } finally {
    first.close();
    second.close();
  }
});

test('a changed login cannot attach to the old session and demotion clears cached staff data', async () => {
  const { host, reads, sessions } = fixture();
  const initial = tab(host),
    changed = tab(host),
    late = tab(host),
    replacement = tab(host);
  const nextScope = 'b'.repeat(43);
  try {
    await initial.command({ type: 'attach', owner: OWNER, scope });
    const refused = changed.next();
    await changed.command({ type: 'attach', owner: OWNER, scope: nextScope });
    assert.deepEqual(await refused, {
      type: 'connection',
      state: { status: 'error', error: 'session_changed' },
    });
    assert.equal(sessions.length, 1);

    const current = sessions[0];
    const emit = (event: ChatSessionEvent) => current.observer.onEvent(event, () => true);
    const peer = { playerUuid: PEER, name: 'Peer', game: true, webConnections: 0 };
    emit({ type: 'presence', players: [peer], staffPlayers: [PEER] });
    await initial.command({ type: 'read', id: 1, queries: [{ channel: 'staff' }] });
    current.staff = false;
    emit({ type: 'permissions', staff: false });
    reads[0].resolve(page('staff'));
    await late.command({ type: 'attach', owner: OWNER, scope });
    await Promise.all([late.drain(), initial.drain()]);
    const events = late.updates.filter((x) => x.type === 'event').map((x) => x.event);
    assert.equal(events.length, 2);
    assert.deepEqual(events[1], { type: 'presence', players: [peer], staffPlayers: [] });
    assert.equal(events[0].type, 'authorized');
    assert.equal(events[0].playerUuid, OWNER);
    assert.equal(events[0].staff, false);
    assert.deepEqual(
      initial.updates.filter((x) => x.type === 'page'),
      [{ type: 'page', id: 1, index: 0, page: undefined, error: 'history_unavailable' }],
    );
    for (const view of [initial, late]) await view.command({ type: 'detach' });
    await replacement.command({ type: 'attach', owner: PEER, scope: nextScope });
    assert.deepEqual(
      sessions.map((s) => [s.owner, s.scope, s.stopped]),
      [
        [OWNER, scope, true],
        [PEER, nextScope, false],
      ],
    );
    await replacement.command({ type: 'detach' });
  } finally {
    for (const view of [initial, changed, late, replacement]) view.close();
  }
});

test('two open tabs persist a live record in a single IndexedDB transaction', async () => {
  const { host, sessions } = fixture();
  const lease = await syncHistoryAccount(OWNER);
  const db = await openChatHistoryDatabase();
  const transaction = db.transaction.bind(db);
  let writes = 0;
  db.transaction = (stores, mode, options) => {
    if (mode === 'readwrite') writes++;
    return transaction(stores, mode, options);
  };
  const tabs = [tab(host), tab(host)];
  try {
    for (const view of tabs) await view.command({ type: 'attach', owner: OWNER, scope });
    const record = message();
    sessions[0].observer.onEvent({ type: 'message', message: record }, () => true);
    await Promise.all(tabs.map(view => view.drain()));
    const replies = Promise.all(tabs.map(view => view.next()));
    await Promise.all(tabs.map(view =>
      view.command({ type: 'persist', id: 1, epoch: lease.epoch, messageId: record.id })));
    for (const reply of await replies) assert.deepEqual(reply, { type: 'stored', id: 1, saved: true });
    assert.equal(writes, 1);
    assert.deepEqual((await loadHistory(lease)).messages.map(m => m.id), [record.id]);
  } finally {
    db.transaction = transaction;
    for (const view of tabs) {
      await view.command({ type: 'detach' });
      view.close();
    }
    await deleteChatHistoryDatabase(() => assert.fail('Leaked database connection'));
  }
});
