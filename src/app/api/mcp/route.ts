// Next.js can answer OPTIONS without loading the SDK and Wiki tooling.
async function handle(request: Request) {
  const { mcpHandler } = await import('@/modules/mcp/server/mcp-handler');
  return mcpHandler(request);
}

export { handle as GET, handle as POST };
