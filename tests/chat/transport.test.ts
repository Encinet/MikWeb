import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { Aes256Gcm, CipherSuite, DhkemP256HkdfSha256, HkdfSha256 } from '@hpke/core';

import { ChatTransport } from '@/modules/chat/lib/connection/chat-transport';
import { CHAT_PROTOCOL_VERSION, CHAT_TRANSPORT_URL } from '@/shared/config/service-config';

const websocket = Object.getOwnPropertyDescriptor(globalThis, 'WebSocket')!;
const location = Object.getOwnPropertyDescriptor(globalThis, 'location');
const origin = 'https://mcmik.top';
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const suite = new CipherSuite({
  kem: new DhkemP256HkdfSha256(),
  kdf: new HkdfSha256(),
  aead: new Aes256Gcm(),
});
const id = 'a'.repeat(32);

class Socket {
  static instance: Socket;
  binaryType = 'blob';
  protocol = CHAT_PROTOCOL_VERSION;
  bufferedAmount = 0;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  writes: Uint8Array<ArrayBuffer>[] = [];
  private changed = Promise.withResolvers<void>();

  constructor(readonly url: string, readonly version: string) {
    Socket.instance = this;
  }

  async next() {
    while (!this.writes.length) await this.changed.promise;
    return this.writes.shift()!;
  }

  send(value: ArrayBuffer | Uint8Array<ArrayBuffer>) {
    this.writes.push(value instanceof ArrayBuffer ? new Uint8Array(value) : value);
    this.changed.resolve();
    this.changed = Promise.withResolvers();
  }

  receive(data: string | ArrayBuffer) {
    this.onmessage?.(new MessageEvent('message', { data }));
  }

  close() {}
}

function encode(bytes: ArrayBuffer) {
  return Buffer.from(bytes).toString('base64url');
}

function record(kind: number, body: unknown, exchange?: number) {
  const bytes = body === undefined ? new Uint8Array() : encoder.encode(JSON.stringify(body));
  const prefix = exchange === undefined ? 1 : 5;
  const frame = new Uint8Array(prefix + bytes.length);
  frame[0] = kind;
  if (exchange !== undefined) new DataView(frame.buffer).setUint32(1, exchange);
  frame.set(bytes, prefix);
  return frame;
}

async function connect() {
  Object.defineProperty(globalThis, 'WebSocket', { configurable: true, value: Socket });
  Object.defineProperty(globalThis, 'location', { configurable: true, value: { origin } });
  const identity = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']);
  const trust = encode(await crypto.subtle.exportKey('raw', identity.publicKey));
  const server = await suite.kem.generateKeyPair();
  const serverKey = encode(await suite.kem.serializePublicKey(server.publicKey));
  const context = [CHAT_PROTOCOL_VERSION, new URL(CHAT_TRANSPORT_URL).pathname, origin, id, serverKey].join('\0');
  const signature = encode(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, identity.privateKey, encoder.encode(context)));
  const transport = new ChatTransport(trust);
  const socket = Socket.instance;
  const announce = () => socket.receive(JSON.stringify({ type: 'hello', connectionId: id, serverKey, signature }));
  return { transport, socket, announce, context, server, serverKey, signature };
}

afterEach(() => {
  Object.defineProperty(globalThis, 'WebSocket', websocket);
  if (location) Object.defineProperty(globalThis, 'location', location);
  else Reflect.deleteProperty(globalThis, 'location');
});

test('authenticates both directions and multiplexes history without the newer Promise or AbortSignal APIs', async () => {
  const { transport, socket, announce, context, server } = await connect();
  const ready = Promise.withResolvers<void>();
  const events: unknown[] = [];
  transport.onmessage = (event) => {
    events.push(event);
    if (events.length === 2) ready.resolve();
  };
  try {
    assert.equal(socket.url, CHAT_TRANSPORT_URL);
    assert.equal(socket.version, CHAT_PROTOCOL_VERSION);
    assert.equal(socket.binaryType, 'arraybuffer');
    announce();
    const proof = await socket.next();
    const client = await suite.kem.deserializePublicKey(proof.slice(0, 65));
    const incoming = await suite.createRecipientContext({
      recipientKey: server, senderPublicKey: client, enc: proof.slice(65, 130), info: encoder.encode(context + '\0client'),
    });
    assert.ok([0, 1].includes(new Uint8Array(await incoming.open(proof.slice(130)))[0]));
    assert.equal(transport.authorizationKey, encode(proof.slice(0, 65).buffer));
    const outgoing = await suite.createSenderContext({
      recipientPublicKey: client, senderKey: server, info: encoder.encode(context + '\0server'),
    });
    socket.receive(outgoing.enc);
    const deliver = async (frame: Uint8Array<ArrayBuffer>) => socket.receive(await outgoing.seal(frame));
    await deliver(record(0, { type: 'authorized' }));
    await ready.promise;
    assert.deepEqual(events, [{ type: 'hello', connectionId: id }, { type: 'authorized' }]);

    const replies: unknown[] = [];
    const cancel = new AbortController();
    const withResolvers = Object.getOwnPropertyDescriptor(Promise, 'withResolvers')!;
    const any = Object.getOwnPropertyDescriptor(AbortSignal, 'any')!;
    let first: Promise<void>;
    let second: Promise<void>;
    try {
      Object.defineProperty(Promise, 'withResolvers', { ...withResolvers, value: undefined });
      Object.defineProperty(AbortSignal, 'any', { ...any, value: undefined });
      first = transport.history({ type: 'history', requestId: 'one', channel: 'public' }, cancel.signal, () => {
        throw new Error('Cancelled history delivered a response');
      });
      second = transport.history(
        { type: 'history', requestId: 'two', channel: 'private' }, new AbortController().signal,
        (event) => replies.push(event),
      );
    } finally {
      Object.defineProperty(Promise, 'withResolvers', withResolvers);
      Object.defineProperty(AbortSignal, 'any', any);
    }
    const result = first.catch((e: Error) => e.message);
    const a = new Uint8Array(await incoming.open(await socket.next()));
    const b = new Uint8Array(await incoming.open(await socket.next()));
    assert.deepEqual([...a.slice(0, 5)], [2, 0, 0, 0, 1]);
    assert.deepEqual([...b.slice(0, 5)], [2, 0, 0, 0, 2]);
    assert.equal(JSON.parse(decoder.decode(b.subarray(5))).requestId, 'two');

    cancel.abort(new Error('cancelled'));
    assert.equal(await result, 'cancelled');
    assert.deepEqual([...new Uint8Array(await incoming.open(await socket.next()))], [5, 0, 0, 0, 1]);
    await deliver(record(2, { type: 'history', requestId: 'one' }, 1));
    await deliver(record(0, { type: 'presence', players: [] }));
    await deliver(record(2, { type: 'history', requestId: 'two' }, 2));
    await deliver(record(4, undefined, 2));
    await second;
    assert.deepEqual(replies, [{ type: 'history', requestId: 'two' }]);
    assert.deepEqual(events[2], { type: 'presence', players: [] });

    const last = transport.history({ type: 'history', requestId: 'three', channel: 'public' }, new AbortController().signal, () => {});
    const closed = assert.rejects(last, { name: 'AbortError' });
    transport.close();
    await closed;
  } finally {
    transport.close();
  }
});

test('rejects a forged server hello before exposing the browser key', async () => {
  const { transport, socket, serverKey, signature } = await connect();
  const failed = Promise.withResolvers<string>();
  transport.onerror = failed.resolve;
  socket.receive(JSON.stringify({
    type: 'hello', connectionId: 'b'.repeat(32), serverKey, signature,
  }));
  assert.equal(await failed.promise, 'protocol');
  assert.deepEqual(socket.writes, []);
  assert.equal(transport.authorizationKey, '');
});
