import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { deflateSync } from 'node:zlib';
import { ChatTransport } from '@/modules/chat/lib/connection/chat-transport';

class Socket {
  static OPEN = 1;
  static latest: Socket;
  readyState = 1;
  bufferedAmount = 0;
  binaryType = '';
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  code: number | null = null;
  sent: (string | ArrayBuffer)[] = [];
  constructor() {
    Socket.latest = this;
  }
  send(data: string | ArrayBuffer) {
    this.sent.push(data);
  }
  close(code: number) {
    this.code = code;
    this.readyState = 3;
    this.onclose?.();
  }
  receive(record: Uint8Array<ArrayBuffer>) {
    this.onmessage?.(new MessageEvent('message', { data: record.buffer }));
  }
}

const encoder = new TextEncoder();
const originalSocket = globalThis.WebSocket;
const originalKey = process.env.NEXT_PUBLIC_WEB_CHAT_PUBLIC_KEY;
let transport: ChatTransport;
let delivered: string[];
let errors: string[];

function frame(json: string | Uint8Array<ArrayBuffer>, compressed: boolean) {
  const clear = typeof json === 'string' ? encoder.encode(json) : json;
  const payload = compressed ? deflateSync(clear) : clear;
  const result = new Uint8Array(payload.length + (compressed ? 5 : 1));
  result[0] = compressed ? 2 : 0;
  if (compressed) new DataView(result.buffer).setUint32(1, clear.length);
  result.set(payload, compressed ? 5 : 1);
  return result;
}

async function until(check: () => boolean) {
  for (let attempt = 0; attempt < 100 && !check(); attempt++)
    await new Promise((resolve) => setTimeout(resolve, 2));
  assert.ok(check(), 'Transport did not settle');
}

beforeEach(() => {
  Reflect.set(globalThis, 'WebSocket', Socket);
  process.env.NEXT_PUBLIC_WEB_CHAT_PUBLIC_KEY = btoa(String.fromCharCode(...new Uint8Array(65)))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
  transport = new ChatTransport();
  // Supply already authenticated bytes to exercise record handling separately from HPKE.
  Reflect.set(transport, 'stage', 'ready');
  Reflect.set(transport, 'session', {
    incoming: { open: async (data: ArrayBuffer) => data.slice(0) },
    generation: 0,
    received: 0,
    sent: 0,
    expiresAt: performance.now() + 60_000,
    expiresAtWallClock: Date.now() + 60_000,
  });
  delivered = [];
  errors = [];
  transport.onmessage = (event) => delivered.push(String(event.data));
  transport.onerror = (error) => errors.push(error);
});

afterEach(() => {
  transport.close();
  globalThis.WebSocket = originalSocket;
  if (originalKey === undefined) delete process.env.NEXT_PUBLIC_WEB_CHAT_PUBLIC_KEY;
  else process.env.NEXT_PUBLIC_WEB_CHAT_PUBLIC_KEY = originalKey;
});

test('compressed history and ordinary live records are delivered in wire order', async () => {
  const history = JSON.stringify({
    type: 'history',
    messages: ['公共 管理 private 🌍'.repeat(500)],
  });
  const live = JSON.stringify({ type: 'message', text: 'live' });
  Socket.latest.receive(frame(history, true));
  Socket.latest.receive(frame(live, false));
  await until(() => delivered.length === 2);
  assert.deepEqual(delivered, [history, live]);
  assert.deepEqual(errors, []);
});

test('the shared compressed record supports live data and presence while requiring negotiation', async () => {
  for (const type of ['message', 'presence'])
    Socket.latest.receive(frame(JSON.stringify({ type, text: '富文本'.repeat(500) }), true));
  await until(() => delivered.length === 2);
  assert.deepEqual(
    delivered.map((json) => JSON.parse(json).type),
    ['message', 'presence'],
  );
  Reflect.set(transport, 'compression', undefined);
  Socket.latest.receive(frame('{"type":"message"}', true));
  await until(() => errors.length === 1);
  assert.equal(Socket.latest.code, 4002);
});

for (const compression of ['deflate', undefined] as const) {
  test(`key confirmation advertises ${compression ?? 'no'} compression inside the encrypted finished record`, async () => {
    Reflect.set(transport, 'compression', compression);
    Reflect.set(transport, 'session', null);
    Reflect.set(transport, 'stage', 'confirmation');
    Reflect.set(transport, 'exchange', {
      generation: 0,
      expiresAt: Date.now() + 5000,
      clientKey: {},
      serverKey: {},
      outgoing: { seal: async (record: Uint8Array<ArrayBuffer>) => record.slice().buffer },
      resume: () => {},
    });
    Reflect.set(transport, 'suite', {
      createRecipientContext: async () => ({
        open: async () => encoder.encode('ready').buffer,
        export: async () => new ArrayBuffer(32),
      }),
    });
    const encoded = (size: number) =>
      btoa(String.fromCharCode(...new Uint8Array(size))).replaceAll('=', '');
    await Reflect.get(transport, 'keyFrame').call(
      transport,
      {
        type: 'key',
        generation: 0,
        enc: encoded(65),
        ciphertext: encoded(21),
      },
      false,
    );
    const sent = Socket.latest.sent.at(-1);
    assert.ok(sent instanceof ArrayBuffer);
    const record = new Uint8Array(sent);
    assert.equal(record[0], 1);
    const finished = JSON.parse(new TextDecoder().decode(record.subarray(1)));
    assert.equal(finished.type, 'finished');
    assert.equal(finished.compression, compression);
    assert.equal(Reflect.get(transport, 'stage'), 'ready');
  });
}

for (const [name, record] of [
  ['authentication data', () => frame('{"type":"authorized"}', true)],
  [
    'corrupt zlib',
    () =>
      frame('{"type":"history"}', true).map((value, index) => (index === 5 ? value ^ 1 : value)),
  ],
  ['invalid UTF-8', () => frame(new Uint8Array([255]), true)],
] as const) {
  test(`compressed ${name} fails closed without delivering later records`, async () => {
    Socket.latest.receive(record());
    Socket.latest.receive(frame('{"type":"message"}', false));
    await until(() => errors.length === 1);
    assert.deepEqual(delivered, []);
    assert.equal(Socket.latest.code, 4002);
  });
}

test('failed authentication discards queued history before decompression or delivery', async () => {
  Reflect.set(transport, 'session', {
    incoming: {
      open: async () => {
        throw new Error('invalid_tag');
      },
    },
    received: 0,
    sent: 0,
    expiresAt: performance.now() + 60_000,
    expiresAtWallClock: Date.now() + 60_000,
  });
  Socket.latest.receive(frame('{"type":"history"}', true));
  await until(() => errors.length === 1);
  assert.equal(Socket.latest.code, 4002);
  assert.deepEqual(delivered, []);
});

test('closing during an asynchronous record open prevents every queued callback', async () => {
  let opened = false;
  let release = (_: ArrayBuffer) => {};
  const session = Reflect.get(transport, 'session');
  session.incoming.open = () => {
    opened = true;
    return new Promise<ArrayBuffer>((resolve) => {
      release = resolve;
    });
  };
  const record = frame('{"type":"history"}', true);
  Socket.latest.receive(record);
  Socket.latest.receive(frame('{"type":"message"}', false));
  await until(() => opened);
  transport.close();
  release(record.buffer);
  await Reflect.get(transport, 'reading');
  assert.deepEqual(delivered, []);
  assert.deepEqual(errors, []);
  assert.equal(Reflect.get(transport, 'cleartext').size, 0);
});
