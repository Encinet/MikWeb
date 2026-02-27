import { NextResponse } from 'next/server';

const MINECRAFT_SERVER = process.env.MINECRAFT_SERVER_URL || 'http://localhost:8080';
const API_KEY = process.env.MINECRAFT_API_KEY || '';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('X-API-Key');

    const response = await fetch(`${MINECRAFT_SERVER}/api/bans`, {
      headers: {
        'X-API-Key': authHeader || API_KEY,
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Failed to fetch bans:', error);

    // 返回模拟数据
    return NextResponse.json(
      [
        {
          id: 1,
          playerName: 'Griefer123',
          playerUuid: '069a79f4-44e9-4726-a5be-fca90e38aaf5',
          reason: {
            'zh-CN': '恶意破坏他人建筑',
            'en': 'Malicious destruction of others\' buildings'
          },
          bannedBy: 'Admin',
          bannedAt: '2024-01-15T10:30:00Z',
          expiresAt: null, // null means permanent
          isPermanent: true
        },
        {
          id: 2,
          playerName: 'Spammer456',
          playerUuid: '8667ba71-b85a-4004-af54-457a9734eed7',
          reason: {
            'zh-CN': '频繁发送垃圾信息',
            'en': 'Frequent spam messages'
          },
          bannedBy: 'Moderator',
          bannedAt: '2024-02-10T15:45:00Z',
          expiresAt: '2024-03-10T15:45:00Z',
          isPermanent: false
        },
        {
          id: 3,
          playerName: 'Cheater789',
          playerUuid: 'f84c6a79-0a4e-45e0-879b-cd49ebd4c4e2',
          reason: {
            'zh-CN': '使用作弊工具破坏游戏平衡',
            'en': 'Using cheats to disrupt game balance'
          },
          bannedBy: 'Admin',
          bannedAt: '2024-01-28T08:20:00Z',
          expiresAt: null,
          isPermanent: true
        }
      ],
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-cache',
        },
      }
    );
  }
}
