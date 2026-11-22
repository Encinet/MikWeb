import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';

import { isRoutingLocale, routing } from '@/shared/i18n/routing';

const intlMiddleware = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const [, locale] = pathname.split('/');
  if (isRoutingLocale(locale) && pathname === `/${locale}/pcl2`) {
    if (!isRawXmlRequest(request) && isBrowserRequest(request)) return NextResponse.next();
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = `/${locale}/pcl2/source`;
    return NextResponse.rewrite(rewriteUrl);
  }

  return intlMiddleware(request);
}

function isRawXmlRequest(request: NextRequest): boolean {
  return (
    request.nextUrl.searchParams.has('raw') || request.nextUrl.searchParams.get('format') === 'xml'
  );
}

function isBrowserRequest(request: NextRequest): boolean {
  const accept = request.headers.get('accept')?.trim().toLowerCase() ?? '';
  const userAgent = request.headers.get('user-agent') ?? '';
  // App Router fetches may reach Proxy with a wildcard Accept. An explicit XML fetch
  // can have the same Sec-Fetch-Dest and must still reach the launcher response.
  const [mediaType] = accept.split(/[;,]/, 1);
  const xmlFetch = mediaType.trim() === 'application/xml' || mediaType.trim() === 'text/xml';
  // Link preview crawlers may send */*. They need HTML metadata, while launchers need XML.
  return (
    accept.includes('text/html') ||
    (request.headers.has('sec-fetch-dest') && !xmlFetch) ||
    /bot|crawler|spider|facebookexternalhit|WhatsApp|SkypeUriPreview|vkShare/i.test(userAgent)
  );
}

export const config = {
  matcher: [
    // Canonical locale URLs already carry the language in the root route param.
    '/((?!_next|_vercel|api(?:/|$)|_not-found/?$|opengraph-image/?$|(?:en|zh-CN)(?:/|$)|.*\\..*).*)',
    {
      source: '/:locale(en|zh-CN)/pcl2',
      // A Next.js navigation/prefetch must not be rewritten to the launcher's XML.
      missing: [{ type: 'header', key: 'rsc', value: '1' }],
    },
  ],
};
