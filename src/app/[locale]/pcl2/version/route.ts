import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';

import { loadPcl2HomepageData } from '@/modules/pcl2/server/pcl2-homepage-data';
import { isRoutingLocale } from '@/shared/i18n/routing';
import { getPcl2HomepagePath } from '@/site/config/site-config';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ locale: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const { locale: rawLocale } = await context.params;

  if (!isRoutingLocale(rawLocale)) {
    return new Response('Not Found', { status: 404 });
  }

  if (isBrowserDocumentRequest(request)) {
    return NextResponse.redirect(new URL(getPcl2HomepagePath(rawLocale), request.url));
  }

  const data = await loadPcl2HomepageData(request, rawLocale);
  const version = createHash('sha256').update(stableSerialize(data)).digest('hex');

  return new Response(`${version}\n`, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}

function isBrowserDocumentRequest(request: Request): boolean {
  const accept = request.headers.get('accept') ?? '';
  return accept.includes('text/html');
}

function stableSerialize(value: unknown): string {
  return JSON.stringify(toStableJson(value));
}

function toStableJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(toStableJson);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const record = value as Record<string, unknown>;
  return Object.fromEntries(
    Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort()
      .map((key) => [key, toStableJson(record[key])]),
  );
}
