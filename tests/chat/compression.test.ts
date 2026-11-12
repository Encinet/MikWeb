import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deflateSync } from 'node:zlib';
import {
  decompressChatPacket,
  MAX_CHAT_BYTES,
  supportedChatCompression,
} from '@/modules/chat/lib/connection/chat-compression';

function compressedHistory(text: string, length?: number): Uint8Array<ArrayBuffer> {
  const clear = new TextEncoder().encode(text);
  const compressed = deflateSync(clear);
  const payload = new Uint8Array(compressed.length + 4);
  new DataView(payload.buffer).setUint32(0, length ?? clear.length);
  payload.set(compressed, 4);
  return payload;
}

test('independent zlib pages restore multilingual text and enforce the exact UTF-8 byte length', async () => {
  for (const text of ['公共消息・管理・private 🌍'.repeat(1000), 'x'.repeat(MAX_CHAT_BYTES)]) {
    const result = await decompressChatPacket(compressedHistory(text));
    assert.equal(new TextDecoder().decode(result), text);
  }
  await assert.rejects(decompressChatPacket(compressedHistory('界', 1)), /chat_record_too_large/);
  await assert.rejects(
    decompressChatPacket(compressedHistory('界', 4)),
    /invalid_chat_record_length/,
  );
});

test('malformed lengths, compressed bombs, truncation, bad checksums, and trailing data are rejected', async () => {
  const text = 'archive'.repeat(1000);
  const truncated = compressedHistory(text).slice(0, -1);
  const corrupt = compressedHistory(text);
  corrupt[corrupt.length - 1] ^= 1;
  const trailing = new Uint8Array(compressedHistory(text).length + 1);
  trailing.set(compressedHistory(text));
  for (const payload of [
    new Uint8Array(4),
    new Uint8Array(MAX_CHAT_BYTES + 1),
    compressedHistory(text, 0),
    compressedHistory(text, MAX_CHAT_BYTES + 1),
    compressedHistory('x'.repeat(2 * 1024 * 1024), 64),
    truncated,
    corrupt,
    trailing,
  ])
    await assert.rejects(decompressChatPacket(payload));
});

test('closing cancels decompression before or during stream consumption', async () => {
  const payload = compressedHistory('x'.repeat(MAX_CHAT_BYTES));
  const before = new AbortController();
  before.abort();
  await assert.rejects(decompressChatPacket(payload, before.signal), { name: 'AbortError' });
  const during = new AbortController();
  const decoding = decompressChatPacket(payload, during.signal);
  during.abort();
  await assert.rejects(decoding, { name: 'AbortError' });
});

test('capability detection falls back when native decompression is unavailable', () => {
  assert.equal(supportedChatCompression(), 'deflate');
  const original = globalThis.DecompressionStream;
  try {
    Reflect.set(globalThis, 'DecompressionStream', undefined);
    assert.equal(supportedChatCompression(), undefined);
  } finally {
    globalThis.DecompressionStream = original;
  }
});
