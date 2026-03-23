import { NextResponse } from 'next/server';

interface ProxyRouteConfig {
  serverUrl: string;
  apiKey: string;
  path: string;
  cacheMaxAge: number;         // seconds (for Cache-Control)
  errorMessage: string;
  onError?: () => Promise<unknown>; // 只有在完全没有缓存且后端挂了，或强制降级时触发
}

export function createProxyHandler(config: ProxyRouteConfig) {
  const { serverUrl, apiKey, path, cacheMaxAge, errorMessage, onError } = config;

  return async function GET(): Promise<NextResponse> {
    const targetUrl = `${serverUrl}${path}`;

    try {
      const response = await fetch(targetUrl, {
        headers: {
          'X-API-Key': apiKey,
          'Accept': 'application/json',
        },
        next: {
          revalidate: cacheMaxAge,
          tags: [path]
        },
        signal: AbortSignal.timeout(5000), // 5秒超时
      });

      if (!response.ok) {
        throw new Error(`Upstream status: ${response.status}`);
      }

      const data = await response.json();

      return NextResponse.json(data, {
        headers: {
          // s-maxage 让 CDN/Edge 缓存
          // stale-while-revalidate 允许在后端挂了的情况下继续服务旧数据
          'Cache-Control': `public, s-maxage=${cacheMaxAge}, stale-while-revalidate=${cacheMaxAge * 3}`,
          'X-Proxy-Cache': 'HIT-OR-MISS',
        },
      });

    } catch (error) {
      console.error(`[Proxy Error] ${path}:`, error);

      // fallback
      if (onError) {
        try {
          const fallback = await onError();
          return NextResponse.json(fallback, {
            headers: { 'X-Cache': 'FALLBACK', 'Cache-Control': 'no-store' },
          });
        } catch (fallbackError) {
          console.error(`[Fallback Failed] ${path}:`, fallbackError);
        }
      }

      // final error response
      return NextResponse.json(
        { error: errorMessage },
        { status: 502, headers: { 'Cache-Control': 'no-store' } }
      );
    }
  };
}
