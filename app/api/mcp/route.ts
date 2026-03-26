import { createMcpHandler } from 'mcp-handler';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      'get_players',
      {
        title: 'Get Players',
        description: 'Get the current online player count and list from the Minecraft server. Returns player names and current count.',
        inputSchema: {},
      },
      async () => {
        const response = await fetch(new URL('/api/players', BASE_URL).href);
        const data = await response.json();
        return {
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        };
      }
    );

    server.registerTool(
      'get_buildings',
      {
        title: 'Get Buildings',
        description: 'Get the list of buildings from the Minecraft server. Returns building information including coordinates, owner, and description.',
        inputSchema: {},
      },
      async () => {
        const response = await fetch(new URL('/api/buildings', BASE_URL).href);
        const data = await response.json();
        return {
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        };
      }
    );

    server.registerTool(
      'get_bans',
      {
        title: 'Get Bans',
        description: 'Get the list of banned players from the Minecraft server. Returns banned player information including name, reason, and ban duration.',
        inputSchema: {},
      },
      async () => {
        const response = await fetch(new URL('/api/bans', BASE_URL).href);
        const data = await response.json();
        return {
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        };
      }
    );
  },
  {},
  { basePath: '/api', verboseLogs: true }
);

export { handler as GET, handler as POST };
