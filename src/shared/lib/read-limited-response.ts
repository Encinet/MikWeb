/** Bound memory while reading a response, including when Content-Length is missing or wrong. */
export async function readLimitedResponse(
  response: Response,
  maxBytes: number,
): Promise<Uint8Array<ArrayBuffer>> {
  if (Number(response.headers.get('content-length')) > maxBytes) {
    await response.body?.cancel().catch(() => {});
    throw new Error('Response exceeds size limit');
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Response body unavailable');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) throw new Error('Response exceeds size limit');
      chunks.push(value);
    }
  } finally {
    // A broken stream may reject cancellation too; preserve the original read/size error.
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}
