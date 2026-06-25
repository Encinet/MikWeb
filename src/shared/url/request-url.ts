import { SITE_URL } from '@/site/config/site-config';

function firstHeaderValue(value: string | null): string | null {
  return value?.split(',')[0]?.trim() || null;
}

function inferProtocol(host: string): string {
  return host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https';
}

export function getRequestOrigin(requestHeaders: Headers): string | null {
  const host = firstHeaderValue(
    requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host'),
  );

  if (!host) {
    return null;
  }

  const protocol = firstHeaderValue(requestHeaders.get('x-forwarded-proto')) ?? inferProtocol(host);
  return `${protocol}://${host}`;
}

export function getRequestOriginFromRequest(request: Request): string {
  return getRequestOrigin(request.headers) ?? new URL(request.url).origin;
}

export function getSiteOriginFromHeaders(requestHeaders: Headers): string {
  return getRequestOrigin(requestHeaders) ?? SITE_URL;
}

export function absoluteUrl(pathname: string, origin: string): string {
  return new URL(pathname, origin).href;
}
