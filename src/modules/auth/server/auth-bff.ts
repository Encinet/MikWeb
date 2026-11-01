import 'server-only';
import { cookies } from 'next/headers';
import {
  RequestBodyLimitError,
  readLimitedRequestBody,
} from '@/shared/server/limited-request-body';

const DATA_AUTH_ORIGIN = process.env.MIKDATA_AUTH_ORIGIN ?? 'https://data.mcmik.top';
const SESSION_COOKIE_NAME = '__Host-mik_sid';
const LOGIN_COOKIE_NAME = '__Host-mik_login';
const MAX_AUTH_BODY_BYTES = 64 * 1024;
const AUTH_POST_PATHS = new Set([
  '/challenges',
  '/me',
  '/logout',
  '/passkeys/options/register',
  '/passkeys/register',
  '/passkeys/options/login',
  '/passkeys/login',
]);
const ACCOUNT_POST_PATHS = new Set([
  '/security',
  '/sessions/revoke',
  '/players/resolve',
  '/chat/authorize',
  '/building-submissions',
  '/building-submissions/mine',
]);

type AuthPathKind = 'auth' | 'account';

interface ProxyOptions {
  kind: AuthPathKind;
  path: string[];
  request: Request;
}

export async function proxyAuthRequest({ kind, path, request }: ProxyOptions): Promise<Response> {
  const routePath = `/${path.map(encodeURIComponent).join('/')}`;
  if (!isAllowedRoute(kind, routePath, request.method)) return authError('not_found', 404);
  if (!isSameOriginRequest(request)) return authError('forbidden', 403);

  let requestBody: Record<string, unknown>;
  try {
    requestBody = await readJsonObject(request);
  } catch (error) {
    return authError(
      error instanceof AuthRequestError ? error.message : 'invalid_request_body',
      error instanceof AuthRequestError ? error.status : 400,
    );
  }

  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value ?? '';
  const browserNonce = cookieStore.get(LOGIN_COOKIE_NAME)?.value ?? '';
  return forwardAuthRequest(request, {
    path: kind === 'account' ? `/me${routePath}` : `/auth${routePath}`,
    method: request.method,
    browserNonce,
    body: buildUpstreamBody({ browserNonce, kind, request, routePath, sessionId, requestBody }),
  });
}

/** Server-only upload operations are excluded from the browser route allowlist. */
export async function callImageUploadService(
  request: Request,
  action: 'reserve' | 'complete',
  payload: Record<string, unknown> = {},
): Promise<Response> {
  if (!isSameOriginRequest(request)) return authError('forbidden', 403);
  const sessionId = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!sessionId) return authError('unauthenticated', 401);
  return forwardAuthRequest(request, {
    path: `/me/images/${action}`,
    method: 'POST',
    body: { ...payload, sessionId },
  });
}

interface UpstreamRequest {
  path: string;
  method: string;
  body?: Record<string, unknown>;
  browserNonce?: string;
}

async function forwardAuthRequest(
  request: Request,
  { path, method, body, browserNonce }: UpstreamRequest,
): Promise<Response> {
  const secret = process.env.MIKWEB_AUTH_CLIENT_SECRET?.trim();
  if (!secret) return authError('auth_not_configured', 503);
  const upstreamHeaders = new Headers({
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-Mik-Client-Key': clientRateLimitKey(request),
    'X-Mikweb-Auth': secret,
  });
  if (browserNonce !== undefined) upstreamHeaders.set('X-Mik-Browser-Nonce', browserNonce);

  try {
    const upstream = await fetch(new URL(path, DATA_AUTH_ORIGIN), {
      method,
      headers: upstreamHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    const responseBody = await upstream.text();
    const headers = new Headers({
      'Cache-Control': 'no-store',
      'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json; charset=utf-8',
    });
    for (const cookie of upstream.headers.getSetCookie()) headers.append('Set-Cookie', cookie);
    for (const name of ['Retry-After', 'X-Content-Type-Options', 'Referrer-Policy']) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    return new Response(responseBody, { status: upstream.status, headers });
  } catch {
    return authError('auth_upstream_unavailable', 502);
  }
}

function buildUpstreamBody({
  browserNonce,
  kind,
  request,
  routePath,
  sessionId,
  requestBody,
}: {
  browserNonce: string;
  kind: AuthPathKind;
  request: Request;
  routePath: string;
  sessionId: string;
  requestBody: Record<string, unknown>;
}): Record<string, unknown> | undefined {
  if (kind === 'account') {
    if (routePath === '/chat/authorize')
      return { sessionId, connectionId: requestBody.connectionId };
    if (routePath === '/players/resolve') return { sessionId, name: requestBody.name };
    if (routePath === '/building-submissions') {
      return { sessionId, payload: requestBody.payload, images: requestBody.images };
    }
    if (routePath === '/sessions/revoke') {
      return {
        sessionId,
        targetSessionId: requestBody.targetSessionId,
        all: requestBody.all === true,
      };
    }
    return { sessionId };
  }

  if (
    routePath === '/me' ||
    routePath === '/logout' ||
    routePath === '/passkeys/options/register'
  ) {
    return { sessionId };
  }

  if (routePath === '/passkeys/register') {
    return { sessionId, credential: requestBody.credential, displayName: requestBody.displayName };
  }

  if (/^\/passkeys\/[^/]+$/.test(routePath) && request.method === 'DELETE') {
    return { sessionId };
  }

  if (/^\/challenges\/[^/]+\/complete$/.test(routePath)) {
    return { browserNonce };
  }

  if (routePath === '/challenges' || routePath === '/passkeys/options/login') {
    return { browserNonce };
  }
  if (routePath === '/passkeys/login') {
    return { browserNonce, credential: requestBody.credential };
  }
  return undefined;
}

function clientRateLimitKey(request: Request): string {
  // Vercel overwrites this header at its trusted ingress.
  const forwarded = request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim();
  return forwarded ? `ip:${forwarded}` : 'ip:unknown';
}

async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  if (!request.body) return {};
  let bytes: Uint8Array;
  try {
    bytes = await readLimitedRequestBody(request, MAX_AUTH_BODY_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyLimitError)
      throw new AuthRequestError('request_body_too_large', 413);
    const timedOut = error instanceof Error && error.message === 'request_body_timeout';
    throw new AuthRequestError(
      timedOut ? 'request_body_timeout' : 'invalid_request_body',
      timedOut ? 408 : 400,
    );
  }
  // HTTP adapters can expose an empty stream for a bodyless POST.
  if (bytes.byteLength === 0) return {};
  if (
    request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() !== 'application/json'
  ) {
    throw new AuthRequestError('unsupported_media_type', 415);
  }
  const raw = new TextDecoder().decode(bytes);
  if (!raw.trim()) return {};
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    throw new AuthRequestError('invalid_json_body', 400);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AuthRequestError('body_must_be_object', 400);
  }
  return body as Record<string, unknown>;
}

function isAllowedRoute(kind: AuthPathKind, path: string, method: string): boolean {
  if (kind === 'account') return method === 'POST' && ACCOUNT_POST_PATHS.has(path);
  if (method === 'POST') {
    return AUTH_POST_PATHS.has(path) || /^\/challenges\/[A-Za-z0-9_-]{24}\/complete$/.test(path);
  }
  if (method === 'GET') return /^\/challenges\/[A-Za-z0-9_-]{24}$/.test(path);
  return method === 'DELETE' && /^\/passkeys\/[A-Za-z0-9_-]{1,2048}$/.test(path);
}

function isSameOriginRequest(request: Request): boolean {
  const site = request.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin' && site !== 'none') return false;
  const origin = request.headers.get('origin');
  if (origin) return origin === new URL(request.url).origin;
  return request.method === 'GET' || site === 'same-origin';
}

function authError(error: string, status: number): Response {
  return Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });
}

class AuthRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
