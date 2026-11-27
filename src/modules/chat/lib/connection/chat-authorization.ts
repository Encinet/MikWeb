import { isRecord } from '@/shared/lib/is-record';

export type ChatAuthorizationResult =
  { ok: true } | { ok: false; status: number; error: string; retryAfterMs?: number };

/** The session checks its generation after this entire request, including the response body. */
export async function authorizeChat(
  connectionId: string,
  clientPublicKey: string,
  signal: AbortSignal,
  chatScope?: string,
): Promise<ChatAuthorizationResult> {
  const response = await fetch('/api/chat/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ connectionId, clientPublicKey, chatScope }),
    cache: 'no-store',
    redirect: 'error',
    signal,
  });
  if (response.ok) return { ok: true };
  const payload: unknown = await response.json().catch(() => null);
  signal.throwIfAborted();
  const body = isRecord(payload) ? payload : {};
  const error = typeof body.error === 'string' ? body.error : 'chat_unavailable';
  const retryAfter = body.retryAfterSeconds;
  const retryAfterMs =
    response.status === 429 &&
    typeof retryAfter === 'number' &&
    Number.isSafeInteger(retryAfter) &&
    retryAfter > 0
      ? Math.min(retryAfter, 60) * 1000
      : undefined;
  return { ok: false, status: response.status, error, retryAfterMs };
}
