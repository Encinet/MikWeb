import { proxyAuthRequest } from '@/modules/auth/server/auth-bff';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

export async function POST(request: Request, context: RouteContext) {
  const { path } = await context.params;
  return proxyAuthRequest({ kind: 'account', path, request });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { path } = await context.params;
  return proxyAuthRequest({ kind: 'account', path, request });
}
