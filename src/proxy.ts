import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';

import { getPcl2HomepagePath } from '@/modules/pcl2/lib/pcl2-homepage-path';
import {
  CSP_NONCE_HEADER,
  documentCsp,
  setDocumentResponseHeaders,
} from '@/shared/config/document-security';
import { isRoutingLocale, routing } from '@/shared/i18n/routing';

const intlMiddleware = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const [, locale] = pathname.split('/', 2);
  const canonical = isRoutingLocale(locale);
  if (canonical && pathname === getPcl2HomepagePath(locale) && wantsPcl2Xml(request)) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = `${pathname}/source`;
    return NextResponse.rewrite(rewriteUrl, {
      // The public XML and the HTML document share this URL.
      headers: { Vary: 'Accept, Sec-Fetch-Dest, User-Agent' },
    });
  }

  // Next can hide Flight headers in Proxy, so share this path with client navigation.
  const nonce = randomBytes(16).toString('base64');
  const policy = documentCsp(nonce);
  const headers = new Headers(request.headers);
  // Next.js uses the request policy to nonce its own scripts. Always replace client values.
  headers.set('Content-Security-Policy', policy);
  headers.set(CSP_NONCE_HEADER, nonce);
  const isCapAsset = /^\/vendor\/cap(?:\/|$)/.test(pathname);
  const response =
    canonical || pathname === '/_not-found' || pathname.includes('.') || isCapAsset
      ? NextResponse.next({ request: { headers } })
      : intlMiddleware(new NextRequest(request, { headers }));
  if (response.headers.has('location')) return response;

  setDocumentResponseHeaders(response.headers, policy);
  return response;
}

function wantsPcl2Xml(request: NextRequest): boolean {
  const { searchParams } = request.nextUrl;
  if (searchParams.has('raw') || searchParams.get('format') === 'xml') return true;

  const accept = request.headers.get('accept')?.toLowerCase() ?? '';
  if (accept.includes('text/html')) return false;
  // Next strips Flight headers before Proxy. Use Fetch Metadata for browser navigations
  // with wildcard Accept, while honoring explicit XML requests from the browser.
  if (request.headers.has('sec-fetch-dest')) {
    const [mediaType] = accept.split(/[;,]/, 1);
    const type = mediaType.trim();
    if (type !== 'application/xml' && type !== 'text/xml') return false;
  }
  // Link preview crawlers may send */*. They need HTML metadata, while launchers need XML.
  const userAgent = request.headers.get('user-agent') ?? '';
  return !/bot|crawler|spider|facebookexternalhit|WhatsApp|SkypeUriPreview|vkShare/i.test(userAgent);
}

export const config = {
  matcher: [
    // Keep this literal for Next's build to analyze. Update it when adding non-HTML routes or locales.
    '/((?!(?:api|_next|_vercel|__nextjs[^/]*|vendor/cap)(?:/|$)|(?:brand|fonts|images)/.*\\..*|(?:robots\\.txt|sitemap\\.xml|opengraph-image)/?$|(?:en|zh-CN)/(?:manifest\\.webmanifest|pcl2/(?:source|version)|opengraph-image|opengraph/[^/]+|thumbnails/[^/]+|buildings/[^/]+/(?:thumbnail|opengraph-image))/?$).*)',
    {
      // A navigation to a missing file under a public asset path can render an HTML 404.
      source: '/:asset(brand|fonts|images|vendor)/:path*',
      has: [{ type: 'header', key: 'accept', value: '.*text/html.*' }],
    },
  ],
};
