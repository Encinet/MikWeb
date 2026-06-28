import { proxyAuthRequest } from '@/modules/auth/server/auth-bff';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

export async function GET(request: Request, context: RouteContext) {
  return proxy(request, context);
}

export async function POST(request: Request, context: RouteContext) {
  return proxy(request, context);
}

export async function DELETE(request: Request, context: RouteContext) {
  return proxy(request, context);
}

async function proxy(request: Request, context: RouteContext): Promise<Response> {
  const { path } = await context.params;
  return proxyAuthRequest({ kind: 'auth', path, request });
}
