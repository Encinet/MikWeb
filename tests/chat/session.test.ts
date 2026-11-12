import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ChatAuthorizationResult } from '@/modules/chat/lib/connection/chat-authorization';
import { authorizeChat } from '@/modules/chat/lib/connection/chat-authorization';
import type {
  ChatSessionEvent,
  ChatSessionTransport,
} from '@/modules/chat/lib/connection/chat-session';
import { ChatSession } from '@/modules/chat/lib/connection/chat-session';
import type { ChatConnection } from '@/modules/chat/model/chat-connection';
import { message, OTHER, OWNER, PEER, player, STREAM } from './fixtures';

class Clock {
  now = 0;
  timers = new Set<{ at: number; run: () => void }>();

  schedule = (run: () => void, delay: number) => {
    const timer = { at: this.now + delay, run };
    this.timers.add(timer);
    return () => this.timers.delete(timer);
  };

  advance(delay: number) {
    const until = this.now + delay;
    for (;;) {
      const next = [...this.timers].sort((a, b) => a.at - b.at)[0];
      if (!next || next.at > until) break;
      this.now = next.at;
      this.timers.delete(next);
      next.run();
    }
    this.now = until;
  }
}

class Transport implements ChatSessionTransport {
  onmessage: ChatSessionTransport['onmessage'] = null;
  onclose: ChatSessionTransport['onclose'] = null;
  onerror: ChatSessionTransport['onerror'] = null;
  readyState: number = WebSocket.OPEN;
  bufferedAmount = 0;
  authorizationKey = 'test-public-key';
  sent: string[] = [];

  send(value: string) {
    this.sent.push(value);
  }

  close() {
    if (this.readyState === WebSocket.CLOSED) return;
    this.readyState = WebSocket.CLOSED;
    this.onclose?.();
  }

  receive(event: unknown) {
    const payload =
      event && typeof event === 'object' && 'type' in event && event.type === 'history'
        ? { databaseId: STREAM, visibilityScope: OTHER, head: '100', ...event }
        : event;
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(payload) }));
  }
}

function harness(
  authorize: (
    id: string,
    key: string,
    signal: AbortSignal,
  ) => Promise<ChatAuthorizationResult> = async () => ({ ok: true }),
) {
  const clock = new Clock();
  const transports: Transport[] = [];
  const events: { event: ChatSessionEvent; current: () => boolean }[] = [];
  const timedOut: string[] = [];
  let state: ChatConnection = { status: 'idle' };
  let refreshes = 0;
  let disconnects = 0;
  const session = new ChatSession(
    OWNER,
    {
      onConnection: (value) => {
        state = value;
      },
      onEvent: (event, current) => events.push({ event, current }),
      onDisconnect: () => {
        disconnects++;
      },
      onDeliveryTimeout: (id) => timedOut.push(id),
      onRefreshAccount: () => {
        refreshes++;
      },
    },
    {
      createTransport: () => {
        const transport = new Transport();
        transports.push(transport);
        return transport;
      },
      authorize,
      now: () => clock.now,
      schedule: clock.schedule,
    },
  );
  const hello = (transport = transports.at(-1)) => {
    assert.ok(transport);
    transport.receive({ type: 'hello', connectionId: 'a'.repeat(32) });
    return transport;
  };
  const online = (staff = false, history = false) => {
    const transport = hello();
    transport.receive({
      type: 'authorized',
      playerUuid: OWNER,
      name: 'Owner',
      staff,
      expiresAt: clock.now + 60_000,
      history,
    });
    return transport;
  };
  return {
    session,
    clock,
    transports,
    events,
    timedOut,
    hello,
    online,
    state: () => state,
    refreshes: () => refreshes,
    disconnects: () => disconnects,
  };
}

async function until(check: () => boolean) {
  for (let i = 0; i < 20 && !check(); i++) await Promise.resolve();
  assert.ok(check(), 'The asynchronous operation did not settle');
}

test('history requests are serialized and throttled while live traffic keeps its own path', async () => {
  const h = harness();
  h.session.retry();
  const transport = h.online(true, true);
  const first = h.session.readHistory({ channel: 'public' });
  const second = h.session.readHistory({ channel: 'private', targetUuid: PEER });
  assert.equal(transport.sent.length, 1);
  const request = JSON.parse(transport.sent[0] ?? '{}');
  transport.receive({ type: 'message', message: message({ id: 'live' }) });
  transport.receive({
    type: 'history',
    requestId: request.requestId,
    channel: 'public',
    messages: [message({ id: 'old' })],
    hasMore: true,
    nextBefore: '12',
  });
  assert.equal((await first).messages[0]?.id, 'old');
  assert.equal(h.events.filter(({ event }) => event.type === 'message').length, 1);
  assert.equal(transport.sent.length, 1);
  h.clock.advance(249);
  assert.equal(transport.sent.length, 1);
  h.clock.advance(1);
  assert.equal(transport.sent.length, 2);
  const next = JSON.parse(transport.sent[1] ?? '{}');
  assert.equal(next.targetUuid, PEER);
  transport.receive({
    type: 'history',
    requestId: next.requestId,
    channel: 'private',
    messages: [],
    hasMore: false,
    nextBefore: '12',
  });
  assert.equal((await second).hasMore, false);
  h.session.stop();
  assert.equal(h.clock.timers.size, 0);
});

test('bounded history pages accept 256 short messages and reject a larger page', async () => {
  for (const count of [256, 257]) {
    const h = harness();
    h.session.retry();
    const transport = h.online(false, true);
    const reading = h.session.readHistory({ channel: 'public' });
    const request = JSON.parse(transport.sent[0]);
    transport.receive({
      type: 'history',
      requestId: request.requestId,
      channel: 'public',
      messages: Array.from({ length: count }, (_, index) =>
        message({ id: `bounded-${index}`, sequence: index + 1 }),
      ),
      hasMore: false,
      nextBefore: '1',
    });
    if (count === 256) assert.equal((await reading).messages.length, count);
    else await assert.rejects(reading);
    h.session.stop();
  }
});

test('history never exposes another private conversation or staff content after demotion', async () => {
  for (const downgrade of [false, true]) {
    const h = harness();
    h.session.retry();
    const transport = h.online(true, true);
    const reading = h.session.readHistory({
      channel: downgrade ? 'staff' : 'private',
      targetUuid: downgrade ? undefined : PEER,
    });
    const rejected = assert.rejects(reading, /connection_failed/);
    const request = JSON.parse(transport.sent[0] ?? '{}');
    if (downgrade) transport.receive({ type: 'permissions', staff: false });
    transport.receive({
      type: 'history',
      requestId: request.requestId,
      channel: downgrade ? 'staff' : 'private',
      messages: [
        message(
          downgrade
            ? { channel: 'staff' }
            : { channel: 'private', sender: player(OTHER), targetUuid: OWNER },
        ),
      ],
      hasMore: false,
      nextBefore: '1',
    });
    await rejected;
    assert.equal(h.state().error, 'invalid_response');
    h.session.stop();
  }
});

test('history failures and late timed-out pages preserve the live connection and stopping cancels queued reads', async () => {
  const h = harness();
  h.session.retry();
  const transport = h.online(false, true);
  const reading = h.session.readHistory({ channel: 'public' });
  const rejected = assert.rejects(reading, /history_unavailable/);
  const request = JSON.parse(transport.sent[0] ?? '{}');
  h.clock.advance(15_000);
  await rejected;
  transport.receive({
    type: 'history',
    requestId: request.requestId,
    channel: 'public',
    messages: [],
    hasMore: false,
    nextBefore: '1',
  });
  assert.equal(h.state().status, 'online');
  const pending = h.session.readHistory({ channel: 'private' });
  const queued = h.session.readHistory({ channel: 'public' });
  const canceled = Promise.all([
    assert.rejects(pending, /connection_failed/),
    assert.rejects(queued, /connection_failed/),
  ]);
  h.session.stop();
  await canceled;
  assert.equal(h.clock.timers.size, 0);
});

test('a late HTTP error body cannot stop a replacement chat connection', async () => {
  const originalFetch = globalThis.fetch;
  let finishBody!: (value: unknown) => void;
  let readingBody = false;
  let requests = 0;
  const body = new Promise<unknown>((resolve) => {
    finishBody = resolve;
  });
  globalThis.fetch = async () => {
    if (++requests > 1) return new Response(null, { status: 200 });
    const response = new Response(null, { status: 401 });
    Object.defineProperty(response, 'json', {
      value: () => {
        readingBody = true;
        return body;
      },
    });
    return response;
  };
  const h = harness(authorizeChat);
  try {
    h.session.retry();
    h.hello();
    await until(() => readingBody);
    h.transports[0].close();
    h.session.recover();
    h.online();
    await until(() => requests === 2);
    finishBody({ error: 'unauthenticated' });
    for (let i = 0; i < 10; i++) await Promise.resolve();
    assert.equal(h.state().status, 'online');
    assert.equal(h.transports.length, 2);
    assert.equal(h.transports[1].readyState, WebSocket.OPEN);
    assert.equal(h.refreshes(), 0);
    assert.equal(h.session.send({ channel: 'public' }, 'Still here').ok, true);
  } finally {
    h.session.stop();
    globalThis.fetch = originalFetch;
  }
});

test('sending requires an authorized identity, current permissions, an online recipient and capacity', () => {
  const h = harness();
  try {
    h.session.retry();
    assert.equal(h.session.send({ channel: 'public' }, 'Too early').ok, false);
    assert.equal(h.transports[0].sent.length, 0);
    const transport = h.online();
    assert.deepEqual(h.session.send({ channel: 'staff' }, 'Restricted'), {
      ok: false,
      error: 'staff_required',
    });
    assert.deepEqual(h.session.send({ channel: 'public' }, 'a\nb'), {
      ok: false,
      error: 'invalid_message',
    });
    const destination = { channel: 'private', targetUuid: PEER, name: 'Alex' } as const;
    assert.deepEqual(h.session.send(destination, 'Private'), {
      ok: false,
      error: 'recipient_unavailable',
    });
    transport.receive({
      type: 'presence',
      players: [{ playerUuid: PEER, name: 'Alex', game: true, webConnections: 0 }],
      staffPlayers: [],
    });
    transport.bufferedAmount = 16 * 1024 + 1;
    assert.deepEqual(h.session.send(destination, 'Private'), { ok: false, error: 'chat_busy' });
    transport.bufferedAmount = 0;
    const result = h.session.send(destination, '  Private  ');
    assert.ok(result.ok);
    assert.equal(result.text, 'Private');
    assert.deepEqual(JSON.parse(transport.sent[0]), {
      type: 'send',
      requestId: result.requestId,
      channel: 'private',
      targetUuid: PEER,
      text: 'Private',
    });
  } finally {
    h.session.stop();
  }
});

test('disconnect recovery keeps one retry, invalidates old events and never resends messages', () => {
  const h = harness();
  try {
    h.session.retry();
    const first = h.online();
    const lateMessage = first.onmessage;
    const guard = h.events[0].current;
    assert.ok(h.session.send({ channel: 'public' }, 'Only once').ok);
    first.close();
    assert.equal(h.state().status, 'reconnecting');
    h.session.recover();
    h.session.recover();
    assert.equal(h.transports.length, 2);
    assert.equal(guard(), false);
    const count = h.events.length;
    lateMessage?.(
      new MessageEvent('message', {
        data: JSON.stringify({ type: 'message', message: message() }),
      }),
    );
    assert.equal(h.events.length, count);
    h.clock.advance(1800);
    assert.equal(h.transports.length, 2);
    assert.equal(h.transports[1].sent.length, 0);
    assert.deepEqual(h.timedOut, []);
  } finally {
    h.session.stop();
  }
});

test('a revoked identity stops automatic retries while its cleanup guard survives socket closure', () => {
  const h = harness();
  try {
    h.session.retry();
    const transport = h.online();
    transport.receive({ type: 'closed', reason: 'session_revoked' });
    const closed = h.events.at(-1);
    assert.equal(closed?.event.type, 'closed');
    assert.equal(closed?.current(), true);
    assert.deepEqual(h.state(), { status: 'error', error: 'session_revoked' });
    assert.equal(h.session.access, null);
    h.clock.advance(100_000);
    h.session.recover();
    assert.equal(h.transports.length, 1);
    assert.equal(h.clock.timers.size, 0);
    h.session.stop();
    assert.equal(closed?.current(), false);
  } finally {
    h.session.stop();
  }
});

test('accepted, rejected and echoed sends cancel their deadlines while unconfirmed sends become unknown', () => {
  const h = harness();
  try {
    h.session.retry();
    const transport = h.online();
    const sent = ['Accepted', 'Rejected', 'Echoed', 'Unconfirmed'].map((text) =>
      h.session.send({ channel: 'public' }, text),
    );
    for (const result of sent) assert.ok(result.ok);
    const ids = sent.map((result) => {
      assert.ok(result.ok);
      return result.requestId;
    });
    transport.receive({ type: 'accepted', requestId: ids[0], messageId: 'accepted-message' });
    transport.receive({ type: 'error', requestId: ids[1], error: 'chat_busy' });
    transport.receive({
      type: 'message',
      message: message({ sender: player(OWNER), requestId: ids[2] }),
    });
    h.clock.advance(10_000);
    assert.deepEqual(h.timedOut, [ids[3]]);
    h.clock.advance(10_000);
    assert.deepEqual(h.timedOut, [ids[3]]);
  } finally {
    h.session.stop();
  }
});

test('stopping aborts authorization and cancels retries, watchdogs and outstanding send deadlines', async () => {
  let authorizationSignal: AbortSignal | undefined;
  const h = harness(async (_id, _key, signal) => {
    authorizationSignal = signal;
    return new Promise(() => {});
  });
  h.session.retry();
  const transport = h.online();
  const guard = h.events[0].current;
  assert.ok(h.session.send({ channel: 'public' }, 'Pending').ok);
  assert.equal(authorizationSignal?.aborted, false);
  h.session.stop();
  assert.equal(authorizationSignal?.aborted, true);
  assert.equal(transport.readyState, WebSocket.CLOSED);
  assert.equal(h.clock.timers.size, 0);
  assert.equal(guard(), false);
  h.clock.advance(100_000);
  assert.deepEqual(h.timedOut, []);
  assert.equal(h.transports.length, 1);
  assert.equal(h.disconnects(), 1);
});

test('renewal stays on the existing connection and replaces its authorization watchdog', async () => {
  const h = harness();
  try {
    h.session.retry();
    const transport = h.online();
    await until(() => h.clock.timers.size === 1);
    h.clock.advance(45_000);
    transport.receive({ type: 'reauthorize' });
    transport.receive({
      type: 'authorized',
      playerUuid: OWNER,
      name: 'Owner',
      staff: true,
      expiresAt: 105_000,
    });
    await until(() => h.clock.timers.size === 1);
    h.clock.advance(20_000);
    h.session.recover();
    assert.equal(h.transports.length, 1);
    assert.equal(h.state().status, 'online');
    assert.equal(h.session.send({ channel: 'staff' }, 'Authorized again').ok, true);
  } finally {
    h.session.stop();
  }
});

test('invalid traffic, mismatched identities and staff traffic after a downgrade fail closed', () => {
  for (const scenario of ['before-authorization', 'wrong-identity', 'downgraded-staff'] as const) {
    const h = harness();
    try {
      h.session.retry();
      if (scenario === 'before-authorization')
        h.transports[0].receive({ type: 'message', message: message() });
      else if (scenario === 'wrong-identity') {
        h.hello();
        h.transports[0].receive({
          type: 'authorized',
          playerUuid: OTHER,
          name: 'Other',
          staff: false,
          expiresAt: 60_000,
        });
      } else {
        const transport = h.online(true);
        transport.receive({ type: 'permissions', staff: false });
        transport.receive({ type: 'message', message: message({ channel: 'staff' }) });
      }
      assert.equal(h.state().status, 'error', scenario);
      assert.equal(h.session.access, null, scenario);
      assert.equal(h.transports[0].readyState, WebSocket.CLOSED, scenario);
      assert.equal(
        h.events.some(({ event }) => event.type === 'message'),
        false,
        scenario,
      );
      h.clock.advance(100_000);
      assert.equal(h.transports.length, 1, scenario);
      assert.equal(h.refreshes(), scenario === 'wrong-identity' ? 1 : 0);
    } finally {
      h.session.stop();
    }
  }
});

test('deferred message consumers lose access immediately when permissions or connections change', () => {
  const h = harness();
  try {
    h.session.retry();
    const transport = h.online(true);
    const record = message({ channel: 'staff' });
    transport.receive({ type: 'message', message: record });
    const current = h.events.at(-1)?.current;
    assert.deepEqual(h.session.accessFor(record), { owner: OWNER, staff: true });
    transport.receive({ type: 'permissions', staff: false });
    assert.equal(current?.(), true);
    assert.equal(h.session.accessFor(record), null);
    assert.equal(
      h.session.accessFor(message({ channel: 'private', sender: player(PEER), targetUuid: OTHER })),
      null,
    );
    transport.close();
    assert.equal(h.session.accessFor(message()), null);
    h.session.recover();
    assert.equal(current?.(), false);
  } finally {
    h.session.stop();
  }
});

test('social authors flow through an authorized session without disconnecting or entering player presence', () => {
  const h = harness();
  h.session.retry();
  const transport = h.online();
  transport.receive({
    type: 'message',
    message: message({
      sender: { id: 'external:guest', name: 'Guest' },
      source: { kind: 'social', platformId: 'matrix', platformName: 'Matrix' },
    }),
  });
  assert.equal(h.state().status, 'online');
  assert.equal(h.events.filter(({ event }) => event.type === 'message').length, 1);
  h.session.stop();
});
