import { NextResponse } from 'next/server';

interface ProxyRouteConfig {
  serverUrl: string;
  apiKey: string;
  path: string;
  cacheDuration: number;       // ms
  cacheMaxAge: number;         // seconds (for Cache-Control)
  errorMessage: string;
}

export function createProxyHandler(config: ProxyRouteConfig) {
  const { serverUrl, apiKey, path, cacheDuration, cacheMaxAge, errorMessage } = config;

  let cachedData: unknown = null;
  let cacheTimestamp = 0;
  let inflightPromise: Promise<unknown> | null = null;

  return async function GET(_request: Request): Promise<NextResponse> {
    const now = Date.now();

    if (cachedData && now - cacheTimestamp < cacheDuration) {
      return NextResponse.json(cachedData, {
        headers: {
          'Cache-Control': `public, s-maxage=${cacheMaxAge}, stale-while-revalidate=${cacheMaxAge * 2}`,
          'X-Cache': 'HIT',
        },
      });
    }

    if (!inflightPromise) {
      inflightPromise = fetch(`${serverUrl}${path}`, {
        headers: {
          'X-API-Key': apiKey,
          'Accept-Encoding': 'gzip, deflate, br',
        },
        signal: AbortSignal.timeout(5000),
      }).then(async (response) => {
        if (!response.ok) throw new Error(`Server responded with ${response.status}`);
        return response.json();
      }).finally(() => {
        inflightPromise = null;
      });
    }

    try {
      const data = await inflightPromise;
      cachedData = data;
      cacheTimestamp = Date.now();

      return NextResponse.json(data, {
        headers: {
          'Cache-Control': `public, s-maxage=${cacheMaxAge}, stale-while-revalidate=${cacheMaxAge * 2}`,
          'X-Cache': 'MISS',
        },
      });
    } catch (error) {
      console.error(`Failed to fetch ${path}:`, error);

      return NextResponse.json(
        { error: errorMessage },
        {
          status: 500,
          headers: { 'Cache-Control': 'no-cache' },
        }
      );
    }
  };
}
