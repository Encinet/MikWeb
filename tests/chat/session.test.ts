import assert from 'node:assert/strict';
import { HistoryStreams } from './history-stream-fixture';
import { test } from 'node:test';
import type { ChatAuthorizationResult } from '@/modules/chat/lib/connection/chat-authorization';
import { authorizeChat } from '@/modules/chat/lib/connection/chat-authorization';
import type {
  ChatSessionEvent,
  ChatSessionTransport,
} from '@/modules/chat/lib/connection/chat-session';
import { ChatSession } from '@/modules/chat/lib/connection/chat-session';
import type { ChatConnection } from '@/modules/chat/model/chat-connection';
import { message, OTHER, OWNER, order, PEER, player } from './fixtures';

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
  readyState: ChatSessionTransport['readyState'] = 'open';
  bufferedAmount = 0;
  authorizationKey = 'test-public-key';
  sent: string[] = [];

  send(value: Parameters<ChatSessionTransport['send']>[0]) {
    this.sent.push(JSON.stringify(value));
  }

  private streams = new HistoryStreams();
  history(...[request, signal, receive]: Parameters<ChatSessionTransport['history']>) {
    return this.streams.run(request, signal, receive, () => this.sent.push(JSON.stringify(request)));
  }

  close() {
    if (this.readyState === 'closed') return;
    this.readyState = 'closed';
    this.onclose?.();
  }

  receive(event: unknown) {
    const payload =
      event && typeof event === 'object' && 'type' in event && event.type === 'history'
        ? { checkpoint: 'a'.repeat(91), reset: false, ...event }
        : event;
    if (!this.streams.receive(payload)) this.onmessage?.(payload);
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
  const online = (staff = false) => {
    const transport = hello();
    transport.receive({
      type: 'authorized',
      playerUuid: OWNER,
      staff,
      validForMs: 60_000,
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

test('history requests and live traffic stay independent without Promise.withResolvers', async (t) => {
  const native = Object.getOwnPropertyDescriptor(Promise, 'withResolvers')!;
  t.after(() => Object.defineProperty(Promise, 'withResolvers', native));
  Object.defineProperty(Promise, 'withResolvers', { ...native, value: undefined });

  const h = harness();
  h.session.retry();
  const transport = h.online(true);
  const first = h.session.readHistory({ channel: 'public' });
  const second = h.session.readHistory({ channel: 'private', targetUuid: PEER });
  assert.equal(transport.sent.length, 2);
  const request = JSON.parse(transport.sent[0] ?? '{}');
  transport.receive({ type: 'message', message: message({ id: 'live' }) });
  transport.receive({
    type: 'history',
    requestId: request.requestId,
    channel: 'public',
    messages: [message({ id: 'old' })],
    nextPage: 'b'.repeat(91),
  });
  assert.equal((await first).messages[0]?.id, 'old');
  assert.equal(h.events.filter(({ event }) => event.type === 'message').length, 1);
  assert.equal(transport.sent.length, 2);
  const next = JSON.parse(transport.sent[1] ?? '{}');
  assert.equal(next.targetUuid, PEER);
  transport.receive({
    type: 'history',
    requestId: next.requestId,
    channel: 'private',
    messages: [],
  });
  assert.equal((await second).nextPage, undefined);
  h.session.stop();
  assert.equal(h.clock.timers.size, 0);
});

test('an empty delta reuses only the checkpoint from its matching incremental query', async () => {
  const since = 'a'.repeat(91);
  const page = 'b'.repeat(91);
  for (const cursor of [{ since }, { page, since }, {}, { since: 'invalid' }]) {
    const h = harness();
    h.session.retry();
    const transport = h.online(false);
    const reading = h.session.readHistory({ channel: 'private', targetUuid: PEER, ...cursor });
    const request = JSON.parse(transport.sent[0]);
    assert.equal(request.since, cursor.page ? undefined : cursor.since);
    transport.receive({ type: 'historyCurrent', requestId: request.requestId });
    if (cursor.since === since && !cursor.page) {
      assert.deepEqual(await reading, {
        type: 'history', requestId: request.requestId, channel: 'private', messages: [], reset: false, checkpoint: since,
      });
    } else {
      await assert.rejects(reading, /invalid_response/);
      assert.equal(h.state().status, 'online');
    }
    h.session.stop();
  }
});

test('bounded history pages accept 256 short messages and reject a larger page', async () => {
  for (const count of [256, 257]) {
    const h = harness();
    h.session.retry();
    const transport = h.online(false);
    const reading = h.session.readHistory({ channel: 'public' });
    const request = JSON.parse(transport.sent[0]);
    transport.receive({
      type: 'history',
      requestId: request.requestId,
      channel: 'public',
      messages: Array.from({ length: count }, (_, index) =>
        message({ id: `bounded-${index}`, order: order(index + 1) }),
      ),
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
    const transport = h.online(true);
    const reading = h.session.readHistory({
      channel: downgrade ? 'staff' : 'private',
      targetUuid: downgrade ? undefined : PEER,
    });
    const rejected = assert.rejects(reading, downgrade ? /staff_required/ : /invalid_response/);
    const request = JSON.parse(transport.sent[0] ?? '{}');
    if (downgrade) transport.receive({ type: 'lease', validForMs: 60_000, staff: false });
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
    });
    await rejected;
    if (downgrade) assert.deepEqual(h.session.access, {owner: OWNER, staff: false});
    else assert.equal(h.state().status, 'online');
    h.session.stop();
  }
});

test('history failures and late timed-out pages preserve the live connection and stopping cancels queued reads', async () => {
  const h = harness();
  h.session.retry();
  const transport = h.online(false);
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
    assert.equal(h.transports[1].readyState, 'open');
    assert.equal(h.refreshes(), 0);
    assert.equal(h.session.send({ channel: 'public' }, 'Still here').ok, true);
  } finally {
    h.session.stop();
    globalThis.fetch = originalFetch;
  }
});

test('a rate-limited reconnect waits for the cooldown and restores history access automatically', async (t) => {
  const responses = [
    Response.json({ ok: true }),
    Response.json({ error: 'rate_limited', retryAfterSeconds: 42 }, { status: 429 }),
    Response.json({ ok: true }),
  ];
  t.mock.method(globalThis, 'fetch', async () => {
    const response = responses.shift();
    assert.ok(response);
    return response;
  });
  const h = harness(authorizeChat);
  t.after(() => h.session.stop());

  h.session.retry();
  const first = h.online();
  await until(() => h.clock.timers.size === 1);
  first.close();
  h.session.recover();
  h.hello();
  await until(() => h.state().error === 'rate_limited');
  assert.deepEqual(h.state(), { status: 'reconnecting', error: 'rate_limited' });
  h.clock.advance(41_999);
  h.session.recover();
  h.session.retry();
  assert.equal(h.transports.length, 2);
  assert.equal(h.session.hasHistory, false);

  h.clock.advance(751);
  assert.equal(h.transports.length, 3);
  h.online();
  assert.equal(h.session.hasHistory, true);
  assert.equal(responses.length, 0);
  assert.equal(h.refreshes(), 0);
});

test('a stalled authorization response is aborted and the next attempt can connect', (t) => {
  let stalled: AbortSignal | undefined;
  const h = harness(async (_id, _key, signal) => {
    if (stalled) return { ok: true };
    stalled = signal;
    return new Promise(() => {});
  });
  t.after(() => h.session.stop());
  h.session.retry();
  const first = h.hello();
  h.clock.advance(8000);
  assert.equal(stalled?.aborted, true);
  assert.equal(first.readyState, 'closed');
  h.clock.advance(1750);
  assert.equal(h.transports.length, 2);
  h.online();
  assert.equal(h.state().status, 'online');
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

test('sending accepts 256 Unicode characters and rejects longer text before transmission', () => {
  const h = harness();
  try {
    h.session.retry();
    const transport = h.online();
    for (const character of ['a', '草', '😀']) {
      const sent = transport.sent.length;
      assert.deepEqual(h.session.send({ channel: 'public' }, character.repeat(257)), {
        ok: false,
        error: 'invalid_message',
      });
      assert.equal(transport.sent.length, sent);
      const text = character.repeat(256);
      assert.equal(h.session.send({ channel: 'public' }, text).ok, true);
      assert.equal(JSON.parse(transport.sent.at(-1) ?? '').text, text);
    }
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
    lateMessage?.({ type: 'message', message: message() });
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
  assert.equal(transport.readyState, 'closed');
  assert.equal(h.clock.timers.size, 0);
  assert.equal(guard(), false);
  h.clock.advance(100_000);
  assert.deepEqual(h.timedOut, []);
  assert.equal(h.transports.length, 1);
  assert.equal(h.disconnects(), 1);
});

test('backend renewal updates permissions and expiry without another browser authorization', async () => {
  let grants = 0;
  const h = harness(async () => { grants++; return { ok: true }; });
  try {
    h.session.retry();
    const transport = h.online();
    await until(() => h.clock.timers.size === 1);
    h.clock.advance(45_000);

    transport.receive({
      type: 'lease',
      staff: true,
      validForMs: 60_000,
    });
    await until(() => h.clock.timers.size === 1);
    assert.equal(grants, 1);
    h.clock.advance(20_000);
    h.session.recover();
    assert.equal(h.transports.length, 1);
    assert.equal(h.state().status, 'online');
    assert.equal(h.session.send({ channel: 'staff' }, 'Authorized again').ok, true);
    transport.receive({ type: 'lease', validForMs: 60_000 });
    h.clock.advance(45_000);
    h.session.recover();
    assert.equal(h.state().status, 'online');
    assert.equal(grants, 1);
    assert.equal(h.transports.length, 1);
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
          staff: false,
          validForMs: 60_000,
        });
      } else {
        const transport = h.online(true);
        transport.receive({ type: 'lease', validForMs: 60_000, staff: false });
        transport.receive({ type: 'message', message: message({ channel: 'staff' }) });
      }
      assert.equal(h.state().status, 'error', scenario);
      assert.equal(h.session.access, null, scenario);
      assert.equal(h.transports[0].readyState, 'closed', scenario);
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
    transport.receive({ type: 'lease', validForMs: 60_000, staff: false });
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

test('presence deltas retain server order and recover a missing revision through a fresh connection', () => {
  const h = harness();
  h.session.retry();
  const transport = h.online(true);
  const self = {playerUuid:OWNER,name:'Owner',game:false,webConnections:1};
  const peer = {playerUuid:PEER,name:'é',game:true,webConnections:0};
  transport.receive({type:'presence',players:[self,peer],staffPlayers:[PEER],revision:1});
  transport.receive({type:'presenceDelta',base:1,revision:2,upsert:[{index:0,player:{...peer,name:'A'}}],remove:[]});
  assert.deepEqual(h.events.at(-1)?.event, {type:'presence',players:[{...peer,name:'A'},self],staffPlayers:[PEER]});
  transport.receive({type:'presenceDelta',base:2,revision:3,upsert:[],remove:[PEER],staffPlayers:[]});
  assert.deepEqual(h.events.at(-1)?.event, {type:'presence',players:[self],staffPlayers:[]});
  transport.receive({type:'presenceDelta',base:4,revision:5,upsert:[],remove:[]});
  assert.equal(transport.readyState, 'closed');
  assert.equal(h.state().status, 'reconnecting');
  h.session.stop();
});

test('resuming three cached channels shares one request and keeps changed, quiet and denied replies separate', async () => {
  const h = harness();
  h.session.retry();
  const socket = h.online(true);
  const cursor = 'a'.repeat(91);
  const [changed, quiet, denied] = h.session.readHistories([
    { channel: 'public', since: cursor }, { channel: 'private', since: cursor }, { channel: 'staff', since: cursor },
  ]);
  const failure = assert.rejects(denied, /staff_required/);
  assert.equal(socket.sent.length, 1);
  const batch = JSON.parse(socket.sent[0]);
  assert.deepEqual(batch.positions, { public: cursor, private: cursor, staff: cursor });
  assert.equal(batch.type, 'resume');
  socket.receive({ type: 'history', channel: 'public', requestId: batch.requestId + '-public',
    messages: [message({ id: 'new' })], checkpoint: 'b'.repeat(91), reset: false });
  socket.receive({ type: 'error', requestId: batch.requestId + '-staff', error: 'staff_required' });
  socket.receive({ type: 'historyCurrent', requestId: batch.requestId, channels: ['private'] });
  assert.equal((await changed).messages[0].id, 'new');
  assert.equal((await quiet).checkpoint, cursor);
  await failure;
  assert.equal(socket.sent.length, 1);
  h.session.stop();
});

test('grouped replies reject unknown channels and discard only revoked staff history', async () => {
  for (const demote of [false, true]) {
    const h = harness();
    h.session.retry();
    const socket = h.online(true);
    const since = 'a'.repeat(91);
    const pages = h.session.readHistories([{ channel: 'private', since }, { channel: 'staff', since }]);
    const staffDenied = assert.rejects(pages[1]);
    const privateResult = demote ? pages[0].then(page => assert.equal(page.checkpoint, since)) : assert.rejects(pages[0]);
    if (demote) socket.receive({ type: 'lease', validForMs: 60_000, staff: false });
    socket.receive({ type: 'historyCurrent', requestId: JSON.parse(socket.sent[0]).requestId,
      channels: ['private', demote ? 'staff' : 'public'] });
    await Promise.all([privateResult, staffDenied]);
    if (demote) assert.deepEqual(h.session.access, {owner: OWNER, staff: false});
    else assert.equal(h.state().status, 'online');
    h.session.stop();
  }
});

test('an ambiguous private send can be confirmed after its recipient went offline without resending its text', () => {
  const h = harness();
  h.session.retry();
  const first = h.online(true);
  first.receive({
    type: 'presence', players: [{ playerUuid: PEER, name: 'Alex', game: true, webConnections: 0 }], staffPlayers: [],
  });
  const privateSend = h.session.send({ channel: 'private', targetUuid: PEER, name: 'Alex' }, 'only once');
  const missing = h.session.send({ channel: 'public' }, 'uncertain');
  const restricted = h.session.send({ channel: 'staff' }, 'staff only');
  assert.ok(privateSend.ok && missing.ok && restricted.ok);
  first.close();
  h.session.recover();
  const second = h.online(false);
  assert.deepEqual(second.sent.map(line => JSON.parse(line)), [
    { type: 'receipts', requestIds: [privateSend.requestId, missing.requestId] },
  ]);
  second.receive({ type: 'receipts', items: [{ requestId: privateSend.requestId, messageId: 'committed' }] });
  assert.deepEqual(h.events.filter(({event}) => event.type === 'accepted').map(({event}) => event), [
    { type: 'accepted', requestId: privateSend.requestId, messageId: 'committed' },
  ]);
  assert.equal(h.events.some(({event}) => event.type === 'error'), false);
  second.close();
  h.session.recover();
  assert.deepEqual(h.online(false).sent, []);
  h.session.stop();
});

test('a cancelled history query releases the channel immediately without releasing another channel', async () => {
  const h = harness();
  h.session.retry();
  const socket = h.online(true);
  const controller = new AbortController();
  const cancelled = h.session.readHistory({ channel: 'public' }, controller.signal);
  const replacement = h.session.readHistory({ channel: 'public' });
  const other = h.session.readHistory({ channel: 'private' });
  assert.deepEqual(socket.sent.map(line => JSON.parse(line).channel), ['public', 'private']);
  controller.abort();
  await assert.rejects(cancelled, /history_unavailable/);
  assert.deepEqual(socket.sent.map(line => JSON.parse(line).channel), ['public', 'private', 'public']);
  for (const line of socket.sent) {
    const { channel, requestId } = JSON.parse(line);
    socket.receive({ type: 'history', channel, requestId, messages: [] });
  }
  await Promise.all([replacement, other]);
  assert.equal(h.state().status, 'online');
  h.session.stop();
});

test('a page cannot advance its checkpoint before FIN or survive a trailing stream error', async () => {
  for (const ending of ['fin', 'reset', 'duplicate'] as const) {
    const h = harness();
    h.session.retry();
    const socket = h.online();
    const end = Promise.withResolvers<void>();
    const since = 'a'.repeat(91);
    socket.history = async (request, _signal, receive) => {
      const page = { type: 'historyCurrent', requestId: request.requestId };
      receive(page);
      await end.promise;
      if (ending === 'duplicate') receive(page);
    };
    let saved = false;
    const reading = h.session.readHistory({ channel: 'public', since }).then(page => { saved = true; return page; });
    await Promise.resolve();
    assert.equal(saved, false);
    if (ending === 'reset') end.reject(new Error('truncated_record'));
    else end.resolve();
    if (ending === 'fin') assert.equal((await reading).checkpoint, since);
    else {
      await assert.rejects(reading, ending === 'duplicate' ? /invalid_response/ : /history_unavailable/);
      assert.equal(saved, false);
    }
    assert.equal(h.state().status, 'online');
    h.session.stop();
  }
});


test('a server-busy channel retries alone after backoff and the wait is cancellable', async () => {
  for (const cancelWait of [true, false]) {
    const h = harness();
    h.session.retry();
    const socket = h.online();
    const controller = new AbortController();
    const since = 'a'.repeat(91);
    const [quiet, busy] = h.session.readHistories([{channel: 'public', since}, {channel: 'private', since}], controller.signal);
    const first = JSON.parse(socket.sent[0]);
    socket.receive({ type: 'historyCurrent', requestId: first.requestId, channels: ['public'] });
    socket.receive({ type: 'error', requestId: first.requestId + '-private', error: 'chat_busy' });
    assert.equal((await quiet).checkpoint, since);
    h.clock.advance(999);
    assert.equal(socket.sent.length, 1);
    if (cancelWait) {
      controller.abort();
      await assert.rejects(busy, /history_unavailable/);
      h.clock.advance(5000);
      assert.equal(socket.sent.length, 1);
    } else {
      h.clock.advance(1);
      assert.deepEqual(JSON.parse(socket.sent[1]), { type: 'resume', requestId: first.requestId, positions: { private: since } });
      socket.receive({ type: 'historyCurrent', requestId: first.requestId, channels: ['private'] });
      assert.equal((await busy).checkpoint, since);
    }
    h.session.stop();
  }
});

test('a busy reconnect receipt lookup retries only its original unresolved IDs', () => {
  const h = harness();
  h.session.retry();
  const first = h.online();
  const sent = h.session.send({ channel: 'public' }, 'ambiguous');
  assert.ok(sent.ok);
  first.close();
  h.session.recover();
  const socket = h.online();
  socket.receive({ type: 'error', requestId: '', error: 'chat_busy' });
  const newer = h.session.send({ channel: 'public' }, 'new');
  assert.ok(newer.ok);
  h.clock.advance(1000);
  assert.deepEqual(JSON.parse(socket.sent.at(-1)!), { type: 'receipts', requestIds: [sent.requestId] });
  assert.equal(h.events.some(({event}) => event.type === 'error'), false);
  h.session.stop();
  assert.equal(h.clock.timers.size, 0);
});
