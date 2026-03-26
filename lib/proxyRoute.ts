import { createHmac } from 'crypto';
import { NextResponse } from 'next/server';

function generateToken(secret: string): string {
  const step = Math.floor(Date.now() / 1000 / 30).toString();
  return createHmac('sha256', secret)
    .update(step)
    .digest('hex');
}

interface ProxyRouteConfig {
  serverUrl: string;
  totpSecret: string;
  path: string;
  cacheMaxAge: number;         // seconds (for Cache-Control)
  errorMessage: string;
  onError?: () => Promise<unknown>; // 只有在完全没有缓存且后端挂了，或强制降级时触发
}

export function createProxyHandler(config: ProxyRouteConfig) {
  const { serverUrl, totpSecret, path, cacheMaxAge, errorMessage, onError } = config;

  return async function GET(): Promise<NextResponse> {
    const targetUrl = `${serverUrl}${path}`;

    try {
      const token = generateToken(totpSecret);

      const response = await fetch(targetUrl, {
        headers: {
          'X-TOTP-Token': token,
          'Accept': 'application/json',
        },
        next: {
          revalidate: cacheMaxAge,
          tags: [path]
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`Upstream status: ${response.status}`);
      }

      const data = await response.json();

      return NextResponse.json(data, {
        headers: {
          'Cache-Control': `public, s-maxage=${cacheMaxAge}, stale-while-revalidate=${cacheMaxAge * 3}`,
          'X-Proxy-Cache': 'HIT-OR-MISS',
        },
      });

    } catch (error) {
      console.error(`[Proxy Error] ${path}:`, error);

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

      return NextResponse.json(
        { error: errorMessage },
        { status: 502, headers: { 'Cache-Control': 'no-store' } }
      );
    }
  };
}
