import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';

import { isRoutingLocale, routing } from '@/shared/i18n/routing';

const intlMiddleware = createMiddleware(routing);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

export default function proxy(request: NextRequest) {
  const pcl2Rewrite = getPcl2XmlRewrite(request);
  if (pcl2Rewrite) {
    return NextResponse.rewrite(pcl2Rewrite);
  }

  if (request.nextUrl.pathname === '/api/mcp') {
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 204, headers: corsHeaders });
    }
    const response = NextResponse.next();
    for (const [key, value] of Object.entries(corsHeaders)) {
      response.headers.set(key, value);
    }
    return response;
  }

  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  return intlMiddleware(request);
}

function getPcl2XmlRewrite(request: NextRequest): URL | null {
  const [, locale, page] = request.nextUrl.pathname.split('/');

  if (!isRoutingLocale(locale) || page !== 'pcl2') {
    return null;
  }

  if (request.nextUrl.pathname !== `/${locale}/pcl2`) {
    return null;
  }

  if (!isRawXmlRequest(request) && isBrowserDocumentRequest(request)) {
    return null;
  }

  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = `/${locale}/pcl2/source`;
  return rewriteUrl;
}

function isRawXmlRequest(request: NextRequest): boolean {
  return (
    request.nextUrl.searchParams.has('raw') || request.nextUrl.searchParams.get('format') === 'xml'
  );
}

function isBrowserDocumentRequest(request: NextRequest): boolean {
  const accept = request.headers.get('accept') ?? '';
  return accept.includes('text/html');
}

export const config = {
  matcher: ['/((?!_next|_vercel|.*\\..*).*)', '/api/mcp'],
};
