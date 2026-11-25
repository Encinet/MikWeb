/** Read up to maxBytes. The caller owns the reader lock and any timeout. */
export async function readStreamBytes(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  maxBytes: number,
  limitError: () => Error,
): Promise<Uint8Array<ArrayBuffer>> {
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const length = value.byteLength;
    if (length === 0) continue;
    size += length;
    if (size > maxBytes) {
      // Cancel without waiting for the source's cleanup promise to settle.
      void reader.cancel().catch(() => undefined);
      throw limitError();
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}
