import { readStreamBytes } from './read-stream-bytes';

const sizeLimitError = () => new Error('Response exceeds size limit');

/** Bound memory while reading a response, including when Content-Length is missing or wrong. */
export async function readLimitedResponse(
  response: Response,
  maxBytes: number,
): Promise<Uint8Array<ArrayBuffer>> {
  if (Number(response.headers.get('content-length')) > maxBytes) {
    void response.body?.cancel().catch(() => undefined);
    throw sizeLimitError();
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Response body unavailable');
  try {
    return await readStreamBytes(reader, maxBytes, sizeLimitError);
  } finally {
    reader.releaseLock();
  }
}
