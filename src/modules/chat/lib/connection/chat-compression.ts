export const MAX_CHAT_BYTES = 128 * 1024;
export const COMPRESSED_APPLICATION_RECORD_TYPE = 2;

export function supportedChatCompression(): 'deflate' | undefined {
  try {
    const probe = new DecompressionStream('deflate');
    void probe.readable.cancel().catch(() => {});
    return 'deflate';
  } catch {
    return undefined;
  }
}

/** One authenticated data frame per zlib stream; never buffer unbounded decompressed output. */
export async function decompressChatPacket(
  payload: Uint8Array<ArrayBuffer>,
  signal?: AbortSignal,
): Promise<Uint8Array<ArrayBuffer>> {
  signal?.throwIfAborted();
  if (payload.length <= 4 || payload.length > MAX_CHAT_BYTES)
    throw new Error('invalid_compressed_record');
  const expected = new DataView(payload.buffer, payload.byteOffset, 4).getUint32(0);
  if (expected === 0 || expected > MAX_CHAT_BYTES) throw new Error('chat_record_too_large');
  let offset = 4;
  const source = new ReadableStream<Uint8Array<ArrayBuffer>>(
    {
      pull(controller) {
        // Bound native expansion before the next output-length check can cancel a malformed stream.
        const end = Math.min(offset + 128, payload.length);
        controller.enqueue(payload.subarray(offset, end));
        offset = end;
        if (offset === payload.length) controller.close();
      },
    },
    { highWaterMark: 0 },
  );
  const reader = source.pipeThrough(new DecompressionStream('deflate'), { signal }).getReader();
  const output = new Uint8Array(expected);
  let size = 0;
  let complete = false;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        signal?.throwIfAborted();
        break;
      }
      try {
        signal?.throwIfAborted();
        if (size + value.length > expected) throw new Error('chat_record_too_large');
        output.set(value, size);
        size += value.length;
      } finally {
        value.fill(0);
      }
    }
    if (size !== expected) throw new Error('invalid_chat_record_length');
    complete = true;
    return output;
  } finally {
    if (!complete) output.fill(0);
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
