export const MAX_CHAT_BYTES = 128 * 1024;
export const COMPRESSED_APPLICATION_RECORD_TYPE = 1;

export const MAX_CHAT_REQUEST_BYTES = 8192;

export function supportsChatDecompression(): boolean {
  try {
    const probe = new DecompressionStream('deflate');
    void probe.readable.cancel().catch(() => {});
    return true;
  } catch {
    return false;
  }
}

/** The four-byte original length is part of the candidate's wire cost. */
export async function compressChatRequest(
  clear: Uint8Array<ArrayBuffer>,
  signal: AbortSignal,
): Promise<Uint8Array<ArrayBuffer> | null> {
  signal.throwIfAborted();
  if (clear.length > MAX_CHAT_REQUEST_BYTES) throw new Error('chat_record_too_large');
  let stream;
  try {
    stream = new CompressionStream('deflate');
  } catch {
    return null;
  }
  const source = new ReadableStream<Uint8Array<ArrayBuffer>>({
    start(controller) {
      controller.enqueue(clear);
      controller.close();
    },
  });
  const response = new Response(source.pipeThrough(stream, { signal }));
  const bytes = new Uint8Array(await response.arrayBuffer());
  try {
    signal.throwIfAborted();
    if (bytes.length + 4 >= clear.length) return null;
    const packet = new Uint8Array(bytes.length + 4);
    new DataView(packet.buffer).setUint32(0, clear.length);
    packet.set(bytes, 4);
    return packet;
  } finally {
    bytes.fill(0);
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
