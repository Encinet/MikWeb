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
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    console.error('Failed to fetch player count:', error);

    // 返回模拟数据作为降级方案
    return NextResponse.json(
      {
        count: 3,
        players: [
          { name: 'Steve', uuid: '069a79f4-44e9-4726-a5be-fca90e38aaf5' },
          { name: 'Alex', uuid: '8667ba71-b85a-4004-af54-457a9734eed7' },
          { name: 'Notch', uuid: '069a79f4-44e9-4726-a5be-fca90e38aaf5' }
        ]
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-cache',
        },
      }
    );
  }
}
