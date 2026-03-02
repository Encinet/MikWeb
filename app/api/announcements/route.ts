import { NextResponse } from 'next/server';

const MINECRAFT_SERVER = process.env.MINECRAFT_SERVER_URL || 'http://localhost:8080';
const API_KEY = process.env.MINECRAFT_API_KEY || '';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('X-API-Key');

    const response = await fetch(`${MINECRAFT_SERVER}/api/announcements`, {
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
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    console.error('Failed to fetch announcements:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch announcements',
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
