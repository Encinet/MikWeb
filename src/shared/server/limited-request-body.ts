import 'server-only';
import { readStreamBytes } from '@/shared/lib/read-stream-bytes';

export class RequestBodyLimitError extends Error {}
const sizeLimitError = () => new RequestBodyLimitError('request_body_too_large');

/** Limits actual streamed bytes, including requests without Content-Length. */
export async function readLimitedRequestBody(
  request: Request | Response,
  maxBytes: number,
): Promise<Uint8Array<ArrayBuffer>> {
  const declared = request.headers.get('Content-Length');
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > maxBytes)) {
    throw sizeLimitError();
  }
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    void reader.cancel().catch(() => undefined);
  }, 10_000);
  try {
    const body = await readStreamBytes(reader, maxBytes, sizeLimitError);
    if (timedOut) throw new Error('request_body_timeout');
    return body;
  } finally {
    clearTimeout(timer);
    reader.releaseLock();
  }
}

export async function readLimitedJson(
  message: Request | Response,
  maxBytes: number,
): Promise<unknown> {
  const bytes = await readLimitedRequestBody(message, maxBytes);
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}
