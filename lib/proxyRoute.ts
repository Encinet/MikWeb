import { NextResponse } from 'next/server';

interface ProxyRouteConfig {
  serverUrl: string;
  apiKey: string;
  path: string;
  cacheDuration: number;       // ms
  cacheMaxAge: number;         // seconds (for Cache-Control)
  errorMessage: string;
  staleOnError?: boolean;      // return stale cache on upstream failure, default true
  onError?: () => Promise<unknown>; // optional fallback fetch on upstream failure
}

export function createProxyHandler(config: ProxyRouteConfig) {
  const { serverUrl, apiKey, path, cacheDuration, cacheMaxAge, errorMessage, staleOnError = true, onError } = config;

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

      if (onError) {
        try {
          const fallback = await onError();
          return NextResponse.json(fallback, {
            headers: { 'Cache-Control': 'no-cache', 'X-Cache': 'FALLBACK' },
          });
        } catch (fallbackError) {
          console.error(`Fallback for ${path} also failed:`, fallbackError);
        }
      }

      if (staleOnError && cachedData) {
        return NextResponse.json(cachedData, {
          headers: {
            'Cache-Control': 'no-cache',
            'X-Cache': 'STALE',
          },
        });
      }

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
