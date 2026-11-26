import assert from 'node:assert/strict';
import { test } from 'node:test';

import { MAX_CHAT_BYTES } from '@/modules/chat/lib/connection/chat-compression';
import { chatRecords, encodeChatRecord } from '@/modules/chat/lib/connection/chat-stream';

async function records(chunks: Uint8Array[]) {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
  const output = [];
  for await (const record of chatRecords(stream)) output.push([...record]);
  return output;
}

test('frames survive every split across a length, a UTF-8 body or the next record', async () => {
  const body = new TextEncoder().encode('消息 🌍');
  const first = encodeChatRecord(0, body);
  const second = encodeChatRecord(1, Uint8Array.of(5));
  const joined = new Uint8Array([...first, ...second]);
  for (let split = 0; split <= joined.length; ++split) {
    assert.deepEqual(await records([joined.subarray(0, split), joined.subarray(split)]), [
      [0, ...body],
      [1, 5],
    ]);
  }
});

test('rejects incomplete and oversized stream records before dispatch', async () => {
  const frame = encodeChatRecord(0, Uint8Array.of(5));
  for (let size = 1; size < frame.length; ++size)
    await assert.rejects(records([frame.subarray(0, size)]), /truncated_record/);
  for (const size of [0, 1, MAX_CHAT_BYTES + 2, 0xffffffff]) {
    const header = new Uint8Array(4);
    new DataView(header.buffer).setUint32(0, size);
    await assert.rejects(records([header]), /invalid_record_length/);
  }
});

test('a server-initiated live stream proves possession once and survives FIN, reset and cancellation of history streams', async () => {
  const { ChatTransport } = await import('@/modules/chat/lib/connection/chat-transport');
  const { CHAT_TRANSPORT_URL } = await import('@/shared/config/service-config');
  const encoder = new TextEncoder();
  const origin = 'https://example.test';
  const location = Object.getOwnPropertyDescriptor(globalThis, 'location');
  const transport = Object.getOwnPropertyDescriptor(globalThis, 'WebTransport');
  const opened = Promise.withResolvers<void>();
  const authorized = Promise.withResolvers<void>();
  const stream = () => {
    const finished = Promise.withResolvers<void>();
    const cancelled = Promise.withResolvers<void>();
    const writes: Uint8Array[] = [];
    let input!: ReadableStreamDefaultController<Uint8Array>;
    const readable = new ReadableStream<Uint8Array>({
      start(controller) {
        input = controller;
      },
      cancel() {
        cancelled.resolve();
      },
    });
    const writable = new WritableStream<Uint8Array>({
      write(chunk) {
        writes.push(chunk);
      },
      close() {
        finished.resolve();
      },
    });
    return {
      readable,
      writable,
      writes,
      finished,
      cancelled,
      input,
      send(event: unknown) {
        input.enqueue(encodeChatRecord(0, encoder.encode(JSON.stringify(event))));
      },
    };
  };
  const live = stream();
  const histories: ReturnType<typeof stream>[] = [];
  const closed = Promise.withResolvers<void>();
  let created = Promise.withResolvers<void>();
  const incoming = new ReadableStream({
    start(controller) {
      controller.enqueue(live);
    },
  });
  class Connection {
    ready = Promise.resolve();
    closed = closed.promise;
    incomingBidirectionalStreams = incoming;
    createBidirectionalStream() {
      const history = stream();
      histories.push(history);
      created.resolve();
      return Promise.resolve(history);
    }
    close() {
      closed.resolve();
    }
  }
  Object.defineProperty(globalThis, 'WebTransport', { configurable: true, value: Connection });
  Object.defineProperty(globalThis, 'location', { configurable: true, value: { origin } });
  const client = new ChatTransport();
  try {
    client.onmessage = (event) => {
      if ((event as { type: string }).type === 'hello') opened.resolve();
      if ((event as { type: string }).type === 'authorized') authorized.resolve();
    };
    const connectionId = 'a'.repeat(32);
    live.send({ type: 'hello', connectionId });
    await opened.promise;
    assert.equal(histories.length, 0);
    assert.equal(live.writes.length, 1);
    const proof = Uint8Array.from(live.writes[0]);
    assert.equal(proof.length, 65);
    const publicKey = await crypto.subtle.importKey(
      'raw',
      Uint8Array.fromBase64(client.authorizationKey, { alphabet: 'base64url' }),
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify'],
    );
    const context = [new URL(CHAT_TRANSPORT_URL).pathname, origin, connectionId, proof[0]].join(
      '\0',
    );
    assert.ok(
      await crypto.subtle.verify(
        { name: 'ECDSA', hash: 'SHA-256' },
        publicKey,
        proof.subarray(1),
        encoder.encode(context),
      ),
    );
    live.send({ type: 'authorized' });
    await authorized.promise;
    const replies: unknown[] = [];
    for (const ending of ['fin', 'reset', 'cancel'] as const) {
      created = Promise.withResolvers<void>();
      const cancel = new AbortController();
      const request = {
        type: 'history',
        requestId: crypto.randomUUID(),
        channel: 'public',
      } as const;
      const result = client.history(request, cancel.signal, (event) => replies.push(event));
      await created.promise;
      const history = histories.at(-1)!;
      await history.finished.promise;
      assert.equal(history.writes.length, 1);
      assert.deepEqual(
        JSON.parse(new TextDecoder().decode(history.writes[0].subarray(5))),
        request,
      );
      if (ending === 'fin') {
        history.send({ type: 'historyCurrent', requestId: request.requestId });
        history.input.close();
        await result;
      } else if (ending === 'reset') {
        history.input.error(new Error('reset'));
        await assert.rejects(result, /reset/);
      } else {
        cancel.abort();
        await Promise.all([assert.rejects(result), history.cancelled.promise]);
      }
      assert.equal(client.readyState, 'open');
    }
    assert.equal(histories.length, 3);
    assert.equal(replies.length, 1);
    const ended = Promise.withResolvers<void>();
    client.onclose = ended.resolve;
    live.input.close();
    await ended.promise;
    assert.equal(client.readyState, 'closed');
  } finally {
    client.close();
    for (const [key, previous] of [
      ['WebTransport', transport],
      ['location', location],
    ] as const) {
      if (previous) Object.defineProperty(globalThis, key, previous);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
