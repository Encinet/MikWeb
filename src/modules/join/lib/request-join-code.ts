import type { JoinCode, JoinCodeError } from '@/modules/join/model/join-code';
import { isJoinCodeResponse } from '@/modules/join/model/join-code';
import type { JoinGroupId } from '@/modules/join/model/join-group';
import { withRequestTimeout } from '@/shared/lib/request-timeout';

export class JoinCodeRequestError extends Error {
  constructor(public readonly code: JoinCodeError) {
    super(code);
  }
}

export async function requestJoinCode(
  group: JoinGroupId,
  token: string,
  { signal, timeoutMs = 20_000 }: { signal: AbortSignal; timeoutMs?: number },
): Promise<{ value: JoinCode; deadline: number; wallDeadline: number }> {
  const startedAt = performance.now();
  const startedWallTime = Date.now();
  const value = await withRequestTimeout(
    timeoutMs,
    async (requestSignal) => {
      try {
        // One Cap token authorizes exactly one request. A retry requires another verification.
        const response = await fetch('/api/join/code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ group, token }),
          cache: 'no-store',
          credentials: 'omit',
          signal: requestSignal,
        });
        if (!response.ok) {
          if (response.status === 403) throw new JoinCodeRequestError('captcha_failed');
          if (response.status === 503) {
            const body: unknown = await response.json();
            throw new JoinCodeRequestError(
              body &&
                typeof body === 'object' &&
                'error' in body &&
                body.error === 'captcha_unavailable'
                ? 'captcha_unavailable'
                : 'unavailable',
            );
          }
          throw new JoinCodeRequestError('request_failed');
        }
        const body: unknown = await response.json();
        if (!isJoinCodeResponse(body)) throw new JoinCodeRequestError('request_failed');
        return body;
      } catch (error) {
        if (requestSignal.aborted && !signal.aborted)
          throw new JoinCodeRequestError('request_timeout');
        throw error;
      }
    },
    signal,
  );
  signal.throwIfAborted();
  // Exclude server verification/boundary waiting, but conservatively subtract network transit.
  const finishedAt = performance.now();
  const elapsed = Math.max(finishedAt - startedAt, Date.now() - startedWallTime);
  const remaining =
    value.expiresAt - value.serverTime - Math.max(0, elapsed - value.processingTimeMs);
  if (remaining <= 0) throw new JoinCodeRequestError('code_expired');
  // Some browsers pause performance.now() during device sleep; either clock may expire the code.
  return { value, deadline: finishedAt + remaining, wallDeadline: Date.now() + remaining };
}
