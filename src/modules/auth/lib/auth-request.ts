export class AuthRequestError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(code);
  }
}

/** Credentials come from HttpOnly cookies; request bodies contain only operation inputs. */
export async function authRequest<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    body?: unknown;
    signal?: AbortSignal;
  } = {},
): Promise<T> {
  return withRequestTimeout(
    10_000,
    async (signal) => {
      const response = await fetch(path, {
        method: options.method ?? 'POST',
        headers: options.body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        cache: 'no-store',
        signal,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new AuthRequestError(
          typeof payload?.error === 'string' ? payload.error : 'request_failed',
          response.status,
        );
      }
      if (!payload || typeof payload !== 'object' || Array.isArray(payload))
        throw new AuthRequestError('invalid_response', 502);
      return payload as T;
    },
    options.signal,
  );
}

import { withRequestTimeout } from '@/shared/lib/request-timeout';
