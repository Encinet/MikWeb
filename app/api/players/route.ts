import { NextResponse } from 'next/server';

// Minecraft 服务器配置
const MINECRAFT_SERVER = process.env.MINECRAFT_SERVER_URL || 'http://localhost:8080';
const API_KEY = process.env.MINECRAFT_API_KEY || '';

export async function GET(request: Request) {
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

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
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
