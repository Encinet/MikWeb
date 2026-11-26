import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deflateSync } from 'node:zlib';
import {
  compressChatRequest,
  decompressChatPacket,
  MAX_CHAT_BYTES,
  supportsChatDecompression,
} from '@/modules/chat/lib/connection/chat-compression';

function compressedPacket(text: string, length?: number): Uint8Array<ArrayBuffer> {
  const clear = new TextEncoder().encode(text);
  const compressed = deflateSync(clear);
  const payload = new Uint8Array(compressed.length + 4);
  new DataView(payload.buffer).setUint32(0, length ?? clear.length);
  payload.set(compressed, 4);
  return payload;
}

test('independent zlib records restore multilingual text and enforce the exact UTF-8 byte length', async () => {
  for (const text of ['公共消息・管理・private 🌍'.repeat(1000), 'x'.repeat(MAX_CHAT_BYTES)]) {
    const result = await decompressChatPacket(compressedPacket(text));
    assert.equal(new TextDecoder().decode(result), text);
  }
  await assert.rejects(decompressChatPacket(compressedPacket('界', 1)), /chat_record_too_large/);
  await assert.rejects(
    decompressChatPacket(compressedPacket('界', 4)),
    /invalid_chat_record_length/,
  );
});

test('malformed lengths, compressed bombs, truncation, bad checksums, and trailing data are rejected', async () => {
  const text = 'archive'.repeat(1000);
  const truncated = compressedPacket(text).slice(0, -1);
  const corrupt = compressedPacket(text);
  corrupt[corrupt.length - 1] ^= 1;
  const trailing = new Uint8Array(compressedPacket(text).length + 1);
  trailing.set(compressedPacket(text));
  for (const payload of [
    new Uint8Array(4),
    new Uint8Array(MAX_CHAT_BYTES + 1),
    compressedPacket(text, 0),
    compressedPacket(text, MAX_CHAT_BYTES + 1),
    compressedPacket('x'.repeat(2 * 1024 * 1024), 64),
    truncated,
    corrupt,
    trailing,
  ])
    await assert.rejects(decompressChatPacket(payload));
});

test('closing cancels decompression before or during stream consumption', async () => {
  const payload = compressedPacket('x'.repeat(MAX_CHAT_BYTES));
  const before = new AbortController();
  before.abort();
  await assert.rejects(decompressChatPacket(payload, before.signal), { name: 'AbortError' });
  const during = new AbortController();
  const decoding = decompressChatPacket(payload, during.signal);
  during.abort();
  await assert.rejects(decoding, { name: 'AbortError' });
});

test('capability detection falls back when native decompression is unavailable', () => {
  assert.equal(supportsChatDecompression(), true);
  const original = globalThis.DecompressionStream;
  try {
    Reflect.set(globalThis, 'DecompressionStream', undefined);
    assert.equal(supportsChatDecompression(), false);
  } finally {
    globalThis.DecompressionStream = original;
  }
});

test('uplink selects even a one-byte saving and keeps ties and expansion plain', async () => {
  const signal = new AbortController().signal;
  // Discover the exact boundary for this native encoder, including the length prefix.
  const clear = (length: number) => new Uint8Array(length).fill(97);
  let tie = false;
  let savedOne = false;
  for (let length = 1; length <= 64; length++) {
    const input = clear(length);
    const stream = new Blob([input]).stream().pipeThrough(new CompressionStream('deflate'));
    const size = (await new Response(stream).arrayBuffer()).byteLength + 4;
    const packet = await compressChatRequest(input, signal);
    assert.equal(packet?.length ?? null, size < length ? size : null);
    if (packet) assert.deepEqual(await decompressChatPacket(packet), input);
    tie ||= size === length;
    savedOne ||= size === length - 1;
  }
  assert.ok(tie && savedOne);
  await assert.rejects(compressChatRequest(clear(8193), signal));
});
