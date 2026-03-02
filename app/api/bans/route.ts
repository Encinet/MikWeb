import { NextResponse } from 'next/server';

const MINECRAFT_SERVER = process.env.MINECRAFT_SERVER_URL || 'http://localhost:8080';
const API_KEY = process.env.MINECRAFT_API_KEY || '';

// In-memory cache
let cachedData: any = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 60000; // 60 seconds (1 minute)

export async function GET(request: Request) {
  const now = Date.now();
  
  // Return cached data if still valid
  if (cachedData && now - cacheTimestamp < CACHE_DURATION) {
    return NextResponse.json(cachedData, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        'X-Cache': 'HIT',
      },
    });
  }

  try {
    const authHeader = request.headers.get('X-API-Key');

    const response = await fetch(`${MINECRAFT_SERVER}/api/bans`, {
      headers: {
        'X-API-Key': authHeader || API_KEY,
        'Accept-Encoding': 'gzip, deflate, br',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }

    const data = await response.json();

    // Update cache
    cachedData = data;
    cacheTimestamp = Date.now();

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    console.error('Failed to fetch bans:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch ban list',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-cache',
        },
      }
    );
  }
}
