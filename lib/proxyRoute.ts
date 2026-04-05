import { createHmac } from 'node:crypto';

import { NextResponse } from 'next/server';

interface DefaultRouteContext {
  params: Promise<Record<string, never>>;
}

type ProxyResponseSource = 'upstream' | 'fallback';
type ProxyCacheStatus = 'MISS' | 'HIT' | 'STALE' | 'COALESCED';

interface RuntimeCacheEntry<TResponse> {
  data: TResponse;
  freshUntil: number;
  staleUntil: number;
  source: ProxyResponseSource;
}

const runtimeResponseCache = new Map<string, RuntimeCacheEntry<unknown>>();
const runtimeResponseInflight = new Map<string, Promise<RuntimeCacheEntry<unknown>>>();

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
type ProxyCacheKeyResolver<TContext> = (
  request: Request,
  context: TContext,
  targetUrl: URL,
) => string | Promise<string>;

interface ProxyRouteConfig<TResponse, TContext = DefaultRouteContext> {
  serverUrl: string;
  totpSecret: string;
  path: ProxyPathResolver<TContext>;
  cacheMaxAge: ProxyCacheResolver<TContext>; // seconds (for Cache-Control)
  runtimeCacheMaxAge?: ProxyCacheResolver<TContext>; // seconds (for in-memory cache)
  runtimeCacheStaleWhileRevalidate?: ProxyCacheResolver<TContext>; // seconds
  runtimeCacheKey?: ProxyCacheKeyResolver<TContext>;
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

function buildCacheControl(maxAge: number | null, source: ProxyResponseSource): string {
  if (source === 'fallback') {
    return 'no-store';
  }

  return maxAge && maxAge > 0
    ? `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 3}`
    : 'no-store';
}

function buildJsonResponse<TResponse>(
  data: TResponse,
  options: {
    cacheControl: string;
    cacheStatus: ProxyCacheStatus;
    source: ProxyResponseSource;
  },
): NextResponse {
  const headers: Record<string, string> = {
    'Cache-Control': options.cacheControl,
    'X-Proxy-Cache': options.cacheStatus,
    'X-Proxy-Source': options.source.toUpperCase(),
  };

  if (options.source === 'fallback') {
    headers['X-Cache'] = 'FALLBACK';
  }

  return NextResponse.json(data, { headers });
}

function getRuntimeCacheEntry<TResponse>(
  cacheKey: string,
  now: number,
): RuntimeCacheEntry<TResponse> | null {
  const entry = runtimeResponseCache.get(cacheKey) as RuntimeCacheEntry<TResponse> | undefined;

  if (!entry) {
    return null;
  }

  if (entry.staleUntil <= now) {
    runtimeResponseCache.delete(cacheKey);
    return null;
  }

  return entry;
}

export function createProxyHandler<TResponse, TContext = DefaultRouteContext>(
  config: ProxyRouteConfig<TResponse, TContext>,
) {
  const {
    serverUrl,
    totpSecret,
    path,
    cacheMaxAge,
    runtimeCacheMaxAge,
    runtimeCacheStaleWhileRevalidate,
    runtimeCacheKey,
    errorMessage,
    onError,
    forwardSearchParams,
  } = config;

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

    const runtimeMaxAge = runtimeCacheMaxAge
      ? await resolveCacheMaxAge(runtimeCacheMaxAge, request, context)
      : null;
    const runtimeStaleAge = runtimeCacheStaleWhileRevalidate
      ? await resolveCacheMaxAge(runtimeCacheStaleWhileRevalidate, request, context)
      : runtimeMaxAge && runtimeMaxAge > 0
        ? runtimeMaxAge * 3
        : null;
    const runtimeKey =
      runtimeMaxAge && runtimeMaxAge > 0
        ? runtimeCacheKey
          ? await runtimeCacheKey(request, context, targetUrl)
          : `${request.method}:${targetUrl.href}`
        : null;

    const fetchAndCache = async (): Promise<RuntimeCacheEntry<TResponse>> => {
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
        const now = Date.now();
        const entry: RuntimeCacheEntry<TResponse> = {
          data,
          freshUntil: now + Math.max(runtimeMaxAge ?? 0, 0) * 1000,
          staleUntil: now + Math.max((runtimeMaxAge ?? 0) + (runtimeStaleAge ?? 0), 0) * 1000,
          source: 'upstream',
        };

        if (runtimeKey && runtimeMaxAge && runtimeMaxAge > 0) {
          runtimeResponseCache.set(runtimeKey, entry);
        }

        return entry;
      } catch (error) {
        console.error(`[Proxy Error] ${resolvedPath}:`, error);

        if (onError) {
          try {
            const fallback = await onError(request, context);
            const now = Date.now();
            const entry: RuntimeCacheEntry<TResponse> = {
              data: fallback,
              freshUntil: now + Math.max(runtimeMaxAge ?? 0, 0) * 1000,
              staleUntil: now + Math.max((runtimeMaxAge ?? 0) + (runtimeStaleAge ?? 0), 0) * 1000,
              source: 'fallback',
            };

            if (runtimeKey && runtimeMaxAge && runtimeMaxAge > 0) {
              runtimeResponseCache.set(runtimeKey, entry);
            }

            return entry;
          } catch (fallbackError) {
            console.error(`[Fallback Failed] ${resolvedPath}:`, fallbackError);
          }
        }

        throw error;
      }
    };

    if (runtimeKey && runtimeMaxAge && runtimeMaxAge > 0) {
      const now = Date.now();
      const cachedEntry = getRuntimeCacheEntry<TResponse>(runtimeKey, now);

      if (cachedEntry && cachedEntry.freshUntil > now) {
        return buildJsonResponse(cachedEntry.data, {
          cacheControl: buildCacheControl(maxAge, cachedEntry.source),
          cacheStatus: 'HIT',
          source: cachedEntry.source,
        });
      }

      if (cachedEntry) {
        if (!runtimeResponseInflight.has(runtimeKey)) {
          const refreshPromise = fetchAndCache()
            .catch((error) => {
              console.error(`[Cache Refresh Failed] ${resolvedPath}:`, error);
              return cachedEntry;
            })
            .finally(() => {
              runtimeResponseInflight.delete(runtimeKey);
            });

          runtimeResponseInflight.set(
            runtimeKey,
            refreshPromise as Promise<RuntimeCacheEntry<unknown>>,
          );
        }

        return buildJsonResponse(cachedEntry.data, {
          cacheControl: buildCacheControl(maxAge, cachedEntry.source),
          cacheStatus: 'STALE',
          source: cachedEntry.source,
        });
      }

      const inflight = runtimeResponseInflight.get(runtimeKey) as
        | Promise<RuntimeCacheEntry<TResponse>>
        | undefined;

      if (inflight) {
        const entry = await inflight;
        return buildJsonResponse(entry.data, {
          cacheControl: buildCacheControl(maxAge, entry.source),
          cacheStatus: 'COALESCED',
          source: entry.source,
        });
      }

      const refreshPromise = fetchAndCache().finally(() => {
        runtimeResponseInflight.delete(runtimeKey);
      });

      runtimeResponseInflight.set(
        runtimeKey,
        refreshPromise as Promise<RuntimeCacheEntry<unknown>>,
      );

      try {
        const entry = await refreshPromise;
        return buildJsonResponse(entry.data, {
          cacheControl: buildCacheControl(maxAge, entry.source),
          cacheStatus: 'MISS',
          source: entry.source,
        });
      } catch {
        return NextResponse.json(
          { error: errorMessage },
          { status: 502, headers: { 'Cache-Control': 'no-store' } },
        );
      }
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

      return buildJsonResponse(data, {
        cacheControl: buildCacheControl(maxAge, 'upstream'),
        cacheStatus: 'MISS',
        source: 'upstream',
      });
    } catch (error) {
      console.error(`[Proxy Error] ${resolvedPath}:`, error);

      if (onError) {
        try {
          const fallback = await onError(request, context);
          return buildJsonResponse(fallback, {
            cacheControl: buildCacheControl(maxAge, 'fallback'),
            cacheStatus: 'MISS',
            source: 'fallback',
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
