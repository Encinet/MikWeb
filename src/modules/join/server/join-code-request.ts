import 'server-only';
import { timingSafeEqual } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { isCapToken } from '@/modules/join/model/join-captcha';
import { minimumJoinCodeLifetime } from '@/modules/join/model/join-code';
import { isJoinGroupId } from '@/modules/join/model/join-group';
import { verifyJoinCaptcha } from '@/modules/join/server/join-captcha';
import { createTotp, decodeBase32 } from '@/modules/join/server/join-totp';
import {
  RequestBodyLimitError,
  readLimitedRequestBody,
} from '@/shared/server/limited-request-body';

function json(body: unknown, status = 200, headers?: Record<string, string>) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers },
  });
}

export async function joinCodeRequest(request: Request): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'invalid_request' }, 405, { allow: 'POST' });
  const url = new URL(request.url);
  if (request.headers.get('origin') !== url.origin) return json({ error: 'invalid_request' }, 403);
  if (url.search) return json({ error: 'invalid_request' }, 400);
  if (
    request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json'
  )
    return json({ error: 'invalid_request' }, 415);
  let body: unknown;
  try {
    body = JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(await readLimitedRequestBody(request, 4096)),
    );
  } catch (error) {
    return json({ error: 'invalid_request' }, error instanceof RequestBodyLimitError ? 413 : 400);
  }
  if (
    !body ||
    typeof body !== 'object' ||
    Array.isArray(body) ||
    Object.keys(body).length !== 2 ||
    !Object.hasOwn(body, 'group') ||
    !('group' in body) ||
    !Object.hasOwn(body, 'token') ||
    !('token' in body)
  )
    return json({ error: 'invalid_request' }, 400);
  const group = body.group;
  if (!isJoinGroupId(group)) return json({ error: 'invalid_request' }, 400);
  if (!isCapToken(body.token)) return json({ error: 'captcha_failed' }, 403);
  const secret = process.env[`QQ_GROUP_${group}_TOTP_SECRET`];
  if (!secret) return json({ error: 'unavailable' }, 503);
  try {
    const startedAt = performance.now();
    const first = process.env.QQ_GROUP_1_TOTP_SECRET;
    const second = process.env.QQ_GROUP_2_TOTP_SECRET;
    if (first && second) {
      const firstBytes = decodeBase32(first);
      const secondBytes = decodeBase32(second);
      if (firstBytes.length === secondBytes.length && timingSafeEqual(firstBytes, secondBytes))
        return json({ error: 'unavailable' }, 503);
    }
    const period = process.env.TOTP_PERIOD === undefined ? 30 : Number(process.env.TOTP_PERIOD);
    if (
      !Number.isInteger(period) ||
      period < 15 ||
      period > 300 ||
      decodeBase32(secret).length < 20
    )
      return json({ error: 'unavailable' }, 503);
    const verification = await verifyJoinCaptcha(body.token, request.signal);
    if (verification !== 'verified')
      return json(
        { error: verification === 'rejected' ? 'captcha_failed' : 'captcha_unavailable' },
        verification === 'rejected' ? 403 : 503,
      );
    const timeToBoundary = period * 1000 - (Date.now() % (period * 1000));
    if (timeToBoundary < minimumJoinCodeLifetime(period) + 1000) {
      // Consume Cap once, then wait for the next CURRENT code; never ask the client for a time.
      await delay(timeToBoundary + 25, undefined, { signal: request.signal });
    }
    request.signal.throwIfAborted();
    // Time, period, digits and secret are never read from request fields or headers.
    const serverTime = Date.now();
    const processingTimeMs = Math.floor(performance.now() - startedAt);
    const code = await createTotp(secret, serverTime, { period });
    return json({ ...code, processingTimeMs });
  } catch {
    return json({ error: 'unavailable' }, 503);
  }
}
