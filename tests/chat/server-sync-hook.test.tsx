import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { act } from 'react';
import { AuthStateContext } from '@/modules/auth/model/auth-state-context';
import type {
  ChatHistoryPage,
  ChatHistoryQuery,
  ChatSessionTransport,
} from '@/modules/chat/lib/connection/chat-session';
import { ChatSession } from '@/modules/chat/lib/connection/chat-session';
import { loadHistory } from '@/modules/chat/lib/history/chat-history';
import {
  deleteChatHistoryDatabase,
  openChatHistoryDatabase,
} from '@/modules/chat/lib/history/chat-history-database';
import type { ChatMessage } from '@/modules/chat/model/chat-protocol';
import { useWebChat } from '@/modules/chat/model/use-web-chat';
import { createBrowserEnvironment } from '../support/browser-environment';
import { message, OWNER, order, PEER, player } from './fixtures';

class Socket implements ChatSessionTransport {
  onmessage: ChatSessionTransport['onmessage'] = null;
  onclose: ChatSessionTransport['onclose'] = null;
  onerror: ChatSessionTransport['onerror'] = null;
  readyState: number = WebSocket.OPEN;
  bufferedAmount = 0;
  authorizationKey = 'test-key';
  constructor(readonly server: Server) {}
  send(json: string) {
    this.server.request(this, JSON.parse(json));
  }
  receive(event: unknown) {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(event) }));
  }
  close() {
    if (this.readyState === WebSocket.CLOSED) return;
    this.readyState = WebSocket.CLOSED;
    this.onclose?.();
  }
}

class Server {
  tokens = new Map<string, { after: number; before: number; head: number }>();
  token(value: { after: number; before: number; head: number }) {
    const token = crypto.randomUUID().replaceAll('-', '').padEnd(91, 'a');
    this.tokens.set(token, value);
    return token;
  }
  rows: { cursor: number; message: ChatMessage }[] = [];
  requests: ChatHistoryQuery[] = [];
  sockets: Socket[] = [];
  pending: { socket: Socket; page: ChatHistoryPage }[] = [];
  hold = true;
  holdBackfill = false;
  staff = false;
  now = Date.now();
  environment = {
    createTransport: () => {
      const socket = new Socket(this);
      this.sockets.push(socket);
      queueMicrotask(() => {
        socket.receive({ type: 'hello', connectionId: 'a'.repeat(32) });
        socket.receive({
          type: 'authorized',
          playerUuid: OWNER,
          name: 'Owner',
          staff: this.staff,
          expiresAt: Date.now() + 60_000,
          history: true,
        });
        socket.receive({ type: 'presence', players: [], staffPlayers: [] });
      });
      return socket;
    },
    authorize: async () => ({ ok: true as const }),
    now: () => this.now,
    schedule: (run: () => void, delay: number) => {
      if (delay > 2000) return () => {};
      const timer = setTimeout(() => {
        this.now += delay;
        run();
      }, 1);
      return () => clearTimeout(timer);
    },
  };
  constructor() {
    for (let index = 1; index <= 205; index++)
      this.add(
        message({ id: `public-${index}`, createdAt: Date.now() - 1000, order: order(index) }),
      );
    this.add(
      message({
        id: 'offline-private',
        channel: 'private',
        sender: player(PEER),
        targetUuid: OWNER,
      }),
    );
    this.add(message({ id: 'staff-secret', channel: 'staff' }));
  }
  add(record: ChatMessage) {
    this.rows.push({
      cursor: this.rows.length + 1,
      message: {
        ...record,
        order: order(this.rows.length + 1),
        expiresAt: Date.now() + 86_400_000,
      },
    });
  }
  request(socket: Socket, query: ChatHistoryQuery & { requestId: string }) {
    this.requests.push(query);
    const progress = (query.page && this.tokens.get(query.page)) || {
      after: query.since ? (this.tokens.get(query.since)?.head ?? 0) : 0,
      before: Number.MAX_SAFE_INTEGER,
      head: this.rows.length,
    };
    const eligible = this.rows
      .filter(
        (row) =>
          row.message.channel === query.channel &&
          row.cursor > progress.after &&
          row.cursor < progress.before &&
          row.cursor <= progress.head,
      )
      .reverse();
    const selected = eligible.slice(0, 100);
    const page: ChatHistoryPage = {
      type: 'history',
      requestId: query.requestId,
      channel: query.channel,
      messages: selected.map((row) => row.message).reverse(),
      reset: false,
      checkpoint: this.token({
        after: progress.head,
        before: Number.MAX_SAFE_INTEGER,
        head: progress.head,
      }),
      ...(eligible.length > selected.length
        ? {
            nextPage: this.token({
              ...progress,
              before: selected.at(-1)?.cursor ?? progress.before,
            }),
          }
        : {}),
    };
    if (this.hold || (this.holdBackfill && query.page)) this.pending.push({ socket, page });
    else queueMicrotask(() => socket.receive(page));
  }
  release() {
    this.hold = false;
    this.holdBackfill = false;
    for (const pending of this.pending.splice(0)) pending.socket.receive(pending.page);
  }
  live() {
    const record = message({ id: 'live-new', order: order(this.rows.length + 1) });
    this.add(record);
    this.sockets.at(-1)?.receive({ type: 'message', message: record });
  }
}

let browser: ReturnType<typeof createBrowserEnvironment>;
let server: Server;
let current: ReturnType<typeof useWebChat> | null;
const originalRetry = ChatSession.prototype.retry;
const account = {
  playerUuid: OWNER,
  currentName: 'Owner',
  role: 'member' as const,
  updatedAt: '',
  passkeyCount: 0,
};
function Harness() {
  current = useWebChat();
  return null;
}
function state() {
  assert.ok(current);
  return current;
}
async function mount(verified = true) {
  await act(async () =>
    browser.root.render(
      <AuthStateContext
        value={{
          account: verified ? account : null,
          authenticated: verified,
          verified,
          isLoading: false,
          refresh: async () => account,
          acceptAuthentication: () => {},
          logout: async () => {},
        }}
      >
        <Harness />
      </AuthStateContext>,
    ),
  );
}
async function until(check: () => boolean) {
  for (let attempt = 0; attempt < 400 && !check(); attempt++)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
    });
  assert.ok(check(), 'History synchronization did not settle');
}
function complete() {
  const history = Object.values(state().serverHistory);
  return history.length >= 2 && history.every((value) => !value.loading && !value.failed);
}
beforeEach(async () => {
  browser = createBrowserEnvironment();
  await deleteChatHistoryDatabase(() => assert.fail('Blocked test database'));
  server = new Server();
  current = null;
  ChatSession.prototype.retry = function () {
    Object.defineProperty(this, 'environment', { configurable: true, value: server.environment });
    originalRetry.call(this);
  };
});
afterEach(async () => {
  await browser.close();
  ChatSession.prototype.retry = originalRetry;
  await deleteChatHistoryDatabase(() => assert.fail('Leaked test database'));
});

test('automatically syncs all pages and offline private threads, deduplicates live traffic and resumes incrementally after reload', async () => {
  await mount();
  await until(() => server.pending.length > 0);
  let notifications = 0;
  state().subscribeMessages(() => {
    notifications++;
  });
  await act(async () => {
    server.live();
    server.release();
  });
  await until(complete);
  assert.equal(state().messages.length, 207);
  assert.equal(new Set(state().messages.map((record) => record.id)).size, 207);
  assert.equal(notifications, 1);
  assert.equal(state().unread.get('public')?.count, 1);
  assert.ok(server.requests.some((request) => request.channel === 'public' && request.page));
  assert.ok(
    server.requests.some((request) => request.channel === 'private' && !request.targetUuid),
  );
  const lease = state().historyLease;
  assert.ok(lease);
  let cache: Awaited<ReturnType<typeof loadHistory>> | undefined;
  await act(async () => {
    cache = await loadHistory(lease);
  });
  assert.ok(cache);
  assert.equal(cache.messages.length, 207);
  assert.equal(cache.historicalIds.size, 206);
  const start = server.requests.length;
  await browser.close();
  browser = createBrowserEnvironment();
  current = null;
  await mount();
  await until(complete);
  assert.equal(state().messages.length, 207);
  assert.ok(
    server.requests.slice(start).every((request) => Boolean(request.since) && !request.page),
  );
});

test('resumes an interrupted backfill from the committed page and discards a page arriving after logout', async () => {
  server.hold = false;
  server.holdBackfill = true;
  await mount();
  await until(() => server.pending.length > 0);
  const lease = state().historyLease;
  assert.ok(lease);
  let cached: Awaited<ReturnType<typeof loadHistory>> | undefined;
  await act(async () => {
    cached = await loadHistory(lease);
  });
  assert.ok(cached);
  assert.ok(cached.syncPositions.public?.page);
  const before = cached.syncPositions.public.page;
  const start = server.requests.length;
  await browser.close();
  browser = createBrowserEnvironment();
  current = null;
  server.holdBackfill = false;
  await mount();
  await until(complete);
  assert.equal(
    server.requests.slice(start).find((request) => request.channel === 'public')?.page,
    before,
  );
  assert.equal(state().messages.length, 206);
  server.hold = true;
  await act(async () => {
    void state().loadServerHistory('public');
  });
  await until(() => server.pending.some((pending) => pending.socket === server.sockets.at(-1)));
  await mount(false);
  await act(async () => server.release());
  assert.equal(state().messages.length, 0);
});

test('a new staff grant backfills staff history and revocation clears it from memory and durable cache', async () => {
  server.hold = false;
  await mount();
  await until(complete);
  assert.equal(
    state().messages.some((record) => record.channel === 'staff'),
    false,
  );
  await act(async () => {
    server.staff = true;
    server.sockets.at(-1)?.receive({ type: 'permissions', staff: true });
  });
  await until(
    () =>
      state().messages.some((record) => record.id === 'staff-secret') &&
      !state().serverHistory.staff?.loading,
  );
  await act(async () => {
    server.staff = false;
    server.sockets.at(-1)?.receive({ type: 'permissions', staff: false });
  });
  assert.equal(
    state().messages.some((record) => record.channel === 'staff'),
    false,
  );
  const lease = state().historyLease;
  assert.ok(lease);
  let snapshot: Awaited<ReturnType<typeof loadHistory>> | undefined;
  await act(async () => {
    snapshot = await loadHistory(lease);
  });
  assert.ok(snapshot);
  assert.equal(
    snapshot.messages.some((record) => record.channel === 'staff'),
    false,
  );
  assert.equal(snapshot.syncPositions.staff, undefined);
});

test('a missed cache-reset notification renews the lease instead of repeatedly requesting the same page', async () => {
  server.hold = false;
  await mount();
  await until(complete);
  const previous = state().historyLease;
  assert.ok(previous);
  const epoch = crypto.randomUUID();
  const db = await openChatHistoryDatabase();
  // Simulate another tab committing a reset while its localStorage notification is unavailable.
  await act(async () => {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['state', 'messages'], 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
      const store = tx.objectStore('state');
      const request = store.get('current');
      request.onsuccess = () => {
        store.put(
          { ...request.result, epoch, syncPositions: {}, readPositions: new Map() },
          'current',
        );
        tx.objectStore('messages').clear();
      };
    });
  });
  assert.equal(state().historyLease?.epoch, previous.epoch);
  const start = server.requests.length;
  await act(async () => {
    void state().loadServerHistory('public');
  });
  await until(() => state().historyLease?.epoch === epoch && complete());
  assert.equal(state().messages.length, 206);
  assert.ok(
    server.requests.slice(start).some((query) => query.channel === 'public' && !query.since),
  );
  assert.ok(
    server.requests.length - start < 12,
    'A stale lease must not spin on rejected page writes',
  );
});

test('private cleanup during a backfill survives late pages and reload while public history remains available', async () => {
  await mount();
  await until(() => server.pending.length > 0);
  await act(async () => {
    assert.equal(await state().clearMessages({ channel: 'private', through: Date.now() }), true);
    server.release();
  });
  await until(complete);
  assert.equal(state().messages.length, 205);
  assert.ok(state().messages.every((record) => record.channel === 'public'));
  await browser.close();
  browser = createBrowserEnvironment();
  current = null;
  await mount();
  await until(complete);
  assert.equal(state().messages.length, 205);
  assert.ok(state().messages.every((record) => record.channel === 'public'));
  await act(async () => {
    assert.equal(await state().clearHistory(), true);
  });
  await until(complete);
  assert.deepEqual(state().messages, []);
  await act(async () => server.live());
  await until(() => state().messages.length === 1);
  assert.equal(state().messages[0].id, 'live-new');
});

test('unavailable browser storage keeps live chat and history synchronization usable in memory', async () => {
  const open = indexedDB.open;
  indexedDB.open = () => {
    throw new Error('Storage unavailable');
  };
  try {
    server.hold = false;
    await mount();
    await until(
      () => state().storageFailed && state().connection.status === 'online' && complete(),
    );
    assert.equal(state().messages.length, 206);
    assert.equal(state().historyLease, null);
    await act(async () => server.live());
    assert.equal(state().messages.at(-1)?.id, 'live-new');
  } finally {
    indexedDB.open = open;
  }
});
