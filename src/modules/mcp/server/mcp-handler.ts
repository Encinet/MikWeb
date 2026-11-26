import 'server-only';

import { createMcpHandler } from 'mcp-handler';

import { routing } from '@/shared/i18n/routing';
import { isRecord } from '@/shared/lib/is-record';
import {
  readLimitedRequestBody,
  RequestBodyLimitError,
} from '@/shared/server/limited-request-body';

import { createPublicMcpTools } from './public-mcp-tools';

const tools = createPublicMcpTools(routing.defaultLocale);
const sdkHandler = createMcpHandler(
  (server) => {
    for (const [name, { execute, ...definition }] of Object.entries(tools)) {
      server.registerTool(
        name,
        { ...definition, annotations: { readOnlyHint: true } },
        async (input, context) => {
          const text = await execute(input, context.mcpReq.signal);
          return { content: [{ type: 'text', text }] };
        },
      );
    }
  },
  { verboseLogs: false, maxSubscriptions: 0 },
);

let activeRequests = 0;

export async function mcpHandler(request: Request): Promise<Response> {
  if (activeRequests >= 8) {
    return Response.json({ error: 'busy' }, { status: 503, headers: { 'Retry-After': '5' } });
  }

  activeRequests++;
  try {
    if (request.method === 'POST') {
      const body = await readLimitedRequestBody(request, 16 * 1024);
      const parsed: unknown = JSON.parse(new TextDecoder().decode(body));
      if (!isRecord(parsed)) return Response.json({ error: 'invalid_request' }, { status: 400 });
      request = new Request(request.url, {
        method: 'POST',
        headers: request.headers,
        body,
        signal: request.signal,
      });
    }
    return await sdkHandler(request);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof RequestBodyLimitError ? 'request_body_too_large' : 'invalid_request',
      },
      { status: error instanceof RequestBodyLimitError ? 413 : 400 },
    );
  } finally {
    activeRequests--;
  }
}
