import { cookies } from 'next/headers';
import type { AuthAccount } from '@/modules/auth/model/auth-types';

const DATA_AUTH_ORIGIN = process.env.MIKDATA_AUTH_ORIGIN ?? 'https://data.mcmik.top';
const SESSION_COOKIE_NAME = '__Host-mik_sid';
const LOGIN_COOKIE_NAME = '__Host-mik_login';

type AuthPathKind = 'auth' | 'account';

interface ProxyOptions {
  kind: AuthPathKind;
  path: string[];
  request: Request;
}

export async function proxyAuthRequest({ kind, path, request }: ProxyOptions): Promise<Response> {
  const secret = process.env.MIKWEB_AUTH_CLIENT_SECRET?.trim();

  if (!secret) {
    return Response.json(
      { error: 'auth_not_configured', detail: 'MIKWEB_AUTH_CLIENT_SECRET is not configured.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value ?? '';
  const browserNonce = cookieStore.get(LOGIN_COOKIE_NAME)?.value ?? '';
  const routePath = `/${path.map(encodeURIComponent).join('/')}`;
  const upstreamPath = kind === 'account' ? `/me${routePath}` : `/auth${routePath}`;
  const upstreamBody = await buildUpstreamBody({
    browserNonce,
    kind,
    request,
    routePath,
    sessionId,
  });

  let upstream: Response;
  try {
    upstream = await fetch(new URL(upstreamPath, DATA_AUTH_ORIGIN), {
      method: upstreamMethod(request.method, kind),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Mik-Client-Key': clientRateLimitKey(request),
        'X-Mikweb-Auth': secret,
      },
      body: upstreamBody === undefined ? undefined : JSON.stringify(upstreamBody),
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return Response.json(
      { error: 'auth_upstream_unavailable' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const responseBody = await upstream.text();
  const headers = new Headers();
  headers.set('Cache-Control', 'no-store');
  headers.set(
    'Content-Type',
    upstream.headers.get('Content-Type') ?? 'application/json; charset=utf-8',
  );
  appendSetCookies(headers, upstream.headers);

  return new Response(responseBody, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}

export async function readAccountSummaryFromCookies(
  request: Request,
): Promise<{ account: AuthAccount | null; response?: Response }> {
  const secret = process.env.MIKWEB_AUTH_CLIENT_SECRET?.trim();

  if (!secret) {
    return {
      account: null,
      response: Response.json(
        { error: 'auth_not_configured', detail: 'MIKWEB_AUTH_CLIENT_SECRET is not configured.' },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      ),
    };
  }

  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value ?? '';
  if (!sessionId) {
    return {
      account: null,
      response: Response.json(
        { error: 'unauthenticated' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } },
      ),
    };
  }

  try {
    const upstream = await fetch(new URL('/me/summary', DATA_AUTH_ORIGIN), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Mik-Client-Key': clientRateLimitKey(request),
        'X-Mikweb-Auth': secret,
      },
      body: JSON.stringify({ sessionId }),
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    const body = (await upstream.json().catch(() => ({}))) as { account?: AuthAccount };
    if (!upstream.ok || !body.account) {
      return {
        account: null,
        response: Response.json(body, {
          status: upstream.status,
          headers: { 'Cache-Control': 'no-store' },
        }),
      };
    }
    return { account: body.account };
  } catch {
    return {
      account: null,
      response: Response.json(
        { error: 'auth_upstream_unavailable' },
        { status: 502, headers: { 'Cache-Control': 'no-store' } },
      ),
    };
  }
}

async function buildUpstreamBody({
  browserNonce,
  kind,
  request,
  routePath,
  sessionId,
}: {
  browserNonce: string;
  kind: AuthPathKind;
  request: Request;
  routePath: string;
  sessionId: string;
}): Promise<Record<string, unknown> | undefined> {
  const requestBody = await readJsonObject(request);

  if (kind === 'account') {
    return { ...requestBody, sessionId };
  }

  if (
    routePath === '/me' ||
    routePath === '/logout' ||
    routePath === '/passkeys/options/register'
  ) {
    return { ...requestBody, sessionId };
  }

  if (routePath === '/passkeys/register') {
    return { ...requestBody, sessionId };
  }

  if (/^\/passkeys\/[^/]+$/.test(routePath) && request.method === 'DELETE') {
    return { sessionId };
  }

  if (/^\/challenges\/[^/]+\/complete$/.test(routePath)) {
    return { ...requestBody, browserNonce };
  }

  if (request.method === 'GET') {
    return undefined;
  }

  return requestBody;
}

function upstreamMethod(method: string, kind: AuthPathKind): string {
  if (kind === 'account') {
    return 'POST';
  }

  return method === 'GET' ? 'GET' : method;
}

function clientRateLimitKey(request: Request): string {
  const headers = request.headers;
  const forwarded =
    firstHeaderValue(headers.get('cf-connecting-ip')) ??
    firstHeaderValue(headers.get('x-vercel-forwarded-for'));
  return forwarded ? `ip:${forwarded}` : 'ip:unknown';
}

function firstHeaderValue(value: string | null): string | undefined {
  const first = value?.split(',')[0]?.trim();
  return first || undefined;
}

async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  if (request.method === 'GET' || request.method === 'HEAD') {
    return {};
  }

  const body = await request.json().catch(() => ({}));
  return body && typeof body === 'object' && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : {};
}

function appendSetCookies(target: Headers, source: Headers): void {
  const getSetCookie = (source as Headers & { getSetCookie?: () => string[] }).getSetCookie;
  const cookiesToSet = getSetCookie
    ? getSetCookie.call(source)
    : splitSetCookieHeader(source.get('set-cookie'));

  for (const cookie of cookiesToSet) {
    target.append('Set-Cookie', cookie);
  }
}

function splitSetCookieHeader(value: string | null): string[] {
  if (!value) {
    return [];
  }

  return value.split(/,\s*(?=__Host-)/);
}
