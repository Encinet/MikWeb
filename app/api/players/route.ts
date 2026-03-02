import { NextResponse } from 'next/server';

// Minecraft 服务器配置
const MINECRAFT_SERVER = process.env.MINECRAFT_SERVER_URL || 'http://localhost:8080';
const API_KEY = process.env.MINECRAFT_API_KEY || '';

// In-memory cache
let cachedData: any = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5000; // 5 seconds

export async function GET(request: Request) {
  // Return cached data if still valid
  const now = Date.now();
  if (cachedData && now - cacheTimestamp < CACHE_DURATION) {
    return NextResponse.json(cachedData, {
      headers: {
        'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=15',
        'X-Cache': 'HIT',
      },
    });
  }

  try {
    // 从请求头获取 API Key（如果需要）
    const authHeader = request.headers.get('X-API-Key');

    // 代理请求到 Minecraft 服务器
    const response = await fetch(`${MINECRAFT_SERVER}/api/players`, {
      headers: {
        'X-API-Key': authHeader || API_KEY,
      },
      // 设置超时
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
        'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=15',
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    console.error('Failed to fetch player count:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch player data',
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
