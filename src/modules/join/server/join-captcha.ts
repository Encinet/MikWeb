import 'server-only';
import type { JoinCaptchaConfig } from '@/modules/join/model/join-captcha';
import { isCapToken } from '@/modules/join/model/join-captcha';
import { withRequestTimeout } from '@/shared/lib/request-timeout';
import { readLimitedRequestBody } from '@/shared/server/limited-request-body';

function readJoinCaptchaCredentials(): (JoinCaptchaConfig & { secret: string }) | null {
  const secret = process.env.CAP_SECRET_KEY?.trim();
  if (!secret) return null;
  try {
    const base = new URL(process.env.CAP_API_ENDPOINT?.trim() ?? '');
    if (
      base.protocol !== 'https:' ||
      base.username ||
      base.password ||
      base.search ||
      base.hash ||
      base.pathname === '/'
    )
      return null;
    if (!base.pathname.endsWith('/')) base.pathname += '/';
    return {
      apiEndpoint: base.href,
      secret,
    };
  } catch {
    return null;
  }
}

/** Explicit public DTO; server credentials never leave this adapter. */
export function getJoinCaptchaConfig(): JoinCaptchaConfig | null {
  const credentials = readJoinCaptchaCredentials();
  return credentials ? { apiEndpoint: credentials.apiEndpoint } : null;
}

export async function verifyJoinCaptcha(
  token: string,
  signal: AbortSignal,
): Promise<'verified' | 'rejected' | 'unavailable'> {
  const config = readJoinCaptchaCredentials();
  if (!config) return 'unavailable';
  if (!isCapToken(token)) return 'rejected';
  try {
    return await withRequestTimeout(
      5000,
      async (requestSignal) => {
        // capd atomically consumes the token. Never cache a successful verification locally.
        const response = await fetch(new URL('siteverify', config.apiEndpoint), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ secret: config.secret, response: token }),
          cache: 'no-store',
          redirect: 'error',
          signal: requestSignal,
        });
        if (response.status >= 400 && response.status < 500) return 'rejected';
        if (!response.ok) return 'unavailable';
        const body: unknown = JSON.parse(
          new TextDecoder('utf-8', { fatal: true }).decode(
            await readLimitedRequestBody(response, 4096),
          ),
        );
        if (requestSignal.aborted) return 'unavailable';
        return body && typeof body === 'object' && 'success' in body && body.success === true
          ? 'verified'
          : 'rejected';
      },
      signal,
    );
  } catch {
    return 'unavailable';
  }
}
