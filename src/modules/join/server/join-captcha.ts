import 'server-only';
import type { JoinCaptchaConfig } from '@/modules/join/model/join-captcha';
import { getCapApiEndpoint } from '@/shared/config/https-endpoints';
import { isRecord } from '@/shared/lib/is-record';
import { withRequestTimeout } from '@/shared/lib/request-timeout';
import { readLimitedJson } from '@/shared/server/limited-request-body';

function readJoinCaptchaCredentials(): (JoinCaptchaConfig & { secret: string }) | null {
  const secret = process.env.CAP_SECRET_KEY?.trim();
  const endpoint = getCapApiEndpoint();
  return secret && endpoint ? { apiEndpoint: endpoint.href, secret } : null;
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
        const body = await readLimitedJson(response, 4096);
        if (requestSignal.aborted) return 'unavailable';
        return isRecord(body) && body.success === true ? 'verified' : 'rejected';
      },
      signal,
    );
  } catch {
    return 'unavailable';
  }
}
