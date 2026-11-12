import 'server-only';

import { isAuthMeResponse, isStaffRole } from '@/modules/auth/model/auth-types';
import { proxyAuthRequest } from '@/modules/auth/server/auth-bff';
import { getWikiContent } from '@/modules/wiki/server/wiki-content';
import { isRoutingLocale } from '@/shared/i18n/routing';

export async function staffWikiRequest(request: Request): Promise<Response> {
  const headers = new Headers({ 'Cache-Control': 'private, no-store', vary: 'Cookie' });
  const locale = new URL(request.url).searchParams.get('locale');
  if (!locale || !isRoutingLocale(locale)) {
    return Response.json({ error: 'invalid_locale' }, { status: 400, headers });
  }

  // The BFF verifies the HttpOnly session with Mik Data on every request.
  const response = await proxyAuthRequest({ kind: 'auth', path: ['me'], request });
  for (const cookie of response.headers.getSetCookie()) headers.append('Set-Cookie', cookie);
  if (!response.ok) {
    return Response.json({ error: 'verification_failed' }, { status: response.status, headers });
  }
  const payload: unknown = await response.json().catch(() => null);
  if (!isAuthMeResponse(payload)) {
    return Response.json({ error: 'verification_failed' }, { status: 502, headers });
  }
  if (!payload.authenticated) {
    return Response.json({ error: 'unauthenticated' }, { status: 401, headers });
  }
  if (!isStaffRole(payload.account.role)) {
    return Response.json({ error: 'forbidden' }, { status: 403, headers });
  }

  return Response.json(await getWikiContent(locale, 'staff'), { headers });
}
