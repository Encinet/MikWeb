export type ChatAuthorizationResult = { ok: true } | { ok: false; status: number; error: string };

/** The session checks its generation after this entire request, including the response body. */
export async function authorizeChat(
  connectionId: string,
  clientPublicKey: string,
  signal: AbortSignal,
): Promise<ChatAuthorizationResult> {
  const response = await fetch('/api/account/chat/authorize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ connectionId, clientPublicKey }),
    cache: 'no-store',
    signal,
  });
  if (response.ok) return { ok: true };
  const payload: unknown = await response.json().catch(() => null);
  const error =
    payload &&
    typeof payload === 'object' &&
    'error' in payload &&
    typeof payload.error === 'string'
      ? payload.error
      : 'chat_unavailable';
  return { ok: false, status: response.status, error };
}
