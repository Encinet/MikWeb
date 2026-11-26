import { MAX_CHAT_BYTES } from './chat-compression';

export class InvalidChatRecord extends Error {}

/** Each stream is a byte sequence. Both the length and the body can span reads. */
export async function* chatRecords(source: ReadableStream<Uint8Array>, signal?: AbortSignal) {
  const reader = source.getReader();
  const cancel = () => {
    void reader.cancel().catch(() => {});
  };
  signal?.addEventListener('abort', cancel, { once: true });
  let complete = false;
  const header = new Uint8Array(4);
  let buffer = header;
  let used = 0;
  try {
    for (;;) {
      signal?.throwIfAborted();
      const { done, value } = await reader.read();
      signal?.throwIfAborted();
      if (done) {
        complete = true;
        if (used || buffer !== header) throw new InvalidChatRecord('truncated_record');
        return;
      }
      let offset = 0;
      while (offset < value.length) {
        const count = Math.min(buffer.length - used, value.length - offset);
        buffer.set(value.subarray(offset, offset + count), used);
        used += count;
        offset += count;
        if (used !== buffer.length) continue;
        used = 0;
        if (buffer === header) {
          const size = new DataView(header.buffer).getUint32(0);
          if (size < 2 || size > MAX_CHAT_BYTES + 1)
            throw new InvalidChatRecord('invalid_record_length');
          buffer = new Uint8Array(size);
        } else {
          yield buffer;
          buffer = header;
        }
      }
    }
  } finally {
    signal?.removeEventListener('abort', cancel);
    if (!complete) cancel();
    reader.releaseLock();
  }
}

export function encodeChatRecord(kind: number, body: Uint8Array): Uint8Array<ArrayBuffer> {
  const frame = new Uint8Array(body.length + 5);
  new DataView(frame.buffer).setUint32(0, body.length + 1);
  frame[4] = kind;
  frame.set(body, 5);
  return frame;
}
