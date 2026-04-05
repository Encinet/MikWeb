import { createHmac } from 'node:crypto';
import { NextResponse } from 'next/server';

interface DefaultRouteContext {
  params: Promise<Record<string, never>>;
}

function generateToken(secret: string): string {
  const step = Math.floor(Date.now() / 1000 / 30).toString();
  return createHmac('sha256', secret).update(step).digest('hex');
}

type ProxyPathResolver<TContext> =
  | string
  | ((request: Request, context: TContext) => string | Promise<string>);
type ProxyCacheResolver<TContext> =
  | number
  | null
  | ((request: Request, context: TContext) => number | null | Promise<number | null>);

interface ProxyRouteConfig<TResponse, TContext = DefaultRouteContext> {
  serverUrl: string;
  totpSecret: string;
  path: ProxyPathResolver<TContext>;
  cacheMaxAge: ProxyCacheResolver<TContext>; // seconds (for Cache-Control)
  errorMessage: string;
  forwardSearchParams?: boolean;
  onError?: (request: Request, context: TContext) => Promise<TResponse>; // 只有在完全没有缓存且后端挂了，或强制降级时触发
}

async function resolveProxyPath<TContext>(
  path: ProxyPathResolver<TContext>,
  request: Request,
  context: TContext,
): Promise<string> {
  return typeof path === 'function' ? await path(request, context) : path;
}

async function resolveCacheMaxAge<TContext>(
  cacheMaxAge: ProxyCacheResolver<TContext>,
  request: Request,
  context: TContext,
): Promise<number | null> {
  return typeof cacheMaxAge === 'function' ? await cacheMaxAge(request, context) : cacheMaxAge;
}

export function createProxyHandler<TResponse, TContext = DefaultRouteContext>(
  config: ProxyRouteConfig<TResponse, TContext>,
) {
  const { serverUrl, totpSecret, path, cacheMaxAge, errorMessage, onError, forwardSearchParams } =
    config;

  return async function Get(request: Request, context: TContext): Promise<NextResponse> {
    const resolvedPath = await resolveProxyPath(path, request, context);
    const maxAge = await resolveCacheMaxAge(cacheMaxAge, request, context);
    const targetUrl = new URL(resolvedPath, serverUrl);

    if (forwardSearchParams) {
      const requestUrl = new URL(request.url);

      requestUrl.searchParams.forEach((value, key) => {
        targetUrl.searchParams.append(key, value);
      });
    }

    try {
      const token = generateToken(totpSecret);
      const fetchOptions: RequestInit & {
        next?: {
          revalidate: number;
          tags: string[];
        };
      } = {
        headers: {
          'X-TOTP-Token': token,
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      };

      if (maxAge && maxAge > 0) {
        fetchOptions.next = {
          revalidate: maxAge,
          tags: [targetUrl.pathname],
        };
      } else {
        fetchOptions.cache = 'no-store';
      }

      const response = await fetch(targetUrl, fetchOptions);

      if (!response.ok) {
        throw new Error(`Upstream status: ${response.status}`);
      }

      const data = (await response.json()) as TResponse;

      return NextResponse.json(data, {
        headers: {
          'Cache-Control':
            maxAge && maxAge > 0
              ? `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 3}`
              : 'no-store',
          'X-Proxy-Cache': 'HIT-OR-MISS',
        },
      });
    } catch (error) {
      console.error(`[Proxy Error] ${resolvedPath}:`, error);

      if (onError) {
        try {
          const fallback = await onError(request, context);
          return NextResponse.json(fallback, {
            headers: { 'X-Cache': 'FALLBACK', 'Cache-Control': 'no-store' },
          });
        } catch (fallbackError) {
          console.error(`[Fallback Failed] ${resolvedPath}:`, fallbackError);
        }
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: 502, headers: { 'Cache-Control': 'no-store' } },
      );
    }
  };
}
