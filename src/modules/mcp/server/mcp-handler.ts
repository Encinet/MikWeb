import 'server-only';

import { createMcpHandler } from 'mcp-handler';
import { z } from 'zod';

import { isAnnouncementItemArray } from '@/modules/announcement/model/announcement-types';
import { isBanItemArray } from '@/modules/ban/model/ban-types';
import type { LocalizedText } from '@/modules/building/model/building-types';
import { getLocalizedText, isBuildingArray } from '@/modules/building/model/building-types';
import { isPlayerOnlinePayload } from '@/modules/player/model/player-types';
import { WIKI_LOCALES } from '@/modules/wiki/lib/wiki-grouping';
import { searchWikiBlocks } from '@/modules/wiki/lib/wiki-search';
import { getWikiContent } from '@/modules/wiki/server/wiki-content';
import { dataApiUrl } from '@/shared/api/data-api-url';
import { SITE_URL } from '@/shared/config/site-config';
import {
  RequestBodyLimitError,
  readLimitedRequestBody,
} from '@/shared/server/limited-request-body';

async function apiFetch<TResponse>(
  url: string,
  validate: (value: unknown) => value is TResponse,
): Promise<TResponse> {
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error('Data service unavailable');
  const bytes = await readLimitedRequestBody(response, 1024 * 1024);
  const data: unknown = JSON.parse(new TextDecoder().decode(bytes));
  if (!validate(data)) throw new Error('Invalid data service response');
  return data;
}

let activeRequests = 0;
export async function mcpHandler(request: Request): Promise<Response> {
  if (activeRequests >= 8)
    return Response.json({ error: 'busy' }, { status: 503, headers: { 'Retry-After': '5' } });
  activeRequests++;
  try {
    if (request.method === 'POST') {
      const body = await readLimitedRequestBody(request, 16 * 1024);
      const parsed: unknown = JSON.parse(new TextDecoder().decode(body));
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
        return Response.json({ error: 'invalid_request' }, { status: 400 });
      request = new Request(request.url, {
        method: 'POST',
        headers: request.headers,
        body: body as BodyInit,
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

const sdkHandler = createMcpHandler(
  (server) => {
    server.registerTool(
      'get_players',
      {
        title: 'Get Players',
        description: 'Get online players from the Minecraft server.',
        inputSchema: z.object({}),
      },
      async () => {
        const data = await apiFetch(dataApiUrl('/players'), isPlayerOnlinePayload);

        if (data.online === -1) {
          return { content: [{ type: 'text', text: 'Server offline.' }] };
        }

        if (data.online === 0) {
          return { content: [{ type: 'text', text: 'Server online, no players.' }] };
        }

        const playerList = data.players.map((p) => `${p.name} (UUID: ${p.uuid})`).join('\n');

        return {
          content: [
            {
              type: 'text',
              text: `There are currently ${data.online} player(s) online:\n\n${playerList}`,
            },
          ],
        };
      },
    );

    server.registerTool(
      'get_buildings',
      {
        title: 'Get Buildings',
        description:
          'Get the list of buildings from the Minecraft server. builders format: "name(contribution%)" sorted by contribution desc. Coordinates include the world name and x, y, z.',
        inputSchema: z.object({
          locale: z
            .enum(WIKI_LOCALES)
            .default('zh-CN')
            .describe('Locale for localized fields (e.g. zh-CN, en).'),
        }),
      },
      async ({ locale }) => {
        const data = await apiFetch(dataApiUrl('/buildings'), isBuildingArray);

        if (data.length === 0) {
          return {
            content: [{ type: 'text', text: 'No buildings found.' }],
          };
        }

        const resolve = (localized: LocalizedText): string => getLocalizedText(localized, locale);

        const lines = data.map((b, i) => {
          const name = resolve(b.name);
          const desc = resolve(b.description);
          const notes = b.source?.notes ? resolve(b.source.notes) : null;
          const tags = b.tags?.map(resolve).filter(Boolean).join(',');
          const { world, x, y, z } = b.coordinates;

          const sortedBuilders = [...b.builders].sort((a, b) => b.weight - a.weight);
          const showWeight =
            sortedBuilders.length > 1 &&
            sortedBuilders.some((b) => b.weight !== sortedBuilders[0].weight);
          const total = sortedBuilders.reduce((s, b) => s + b.weight, 0);
          const builders = sortedBuilders
            .map((b) =>
              showWeight ? `${b.name}(${Math.round((b.weight / total) * 100)}%)` : b.name,
            )
            .join(',');

          const fields = [
            `type:${b.buildType}`,
            `world:${world} x:${x} y:${y} z:${z}`,
            `date:${b.buildDate}`,
            builders && `builders:${builders}`,
            tags && `tags:${tags}`,
            b.source?.originalAuthor && `author:${b.source.originalAuthor}`,
            b.source?.originalLink && `source:${b.source.originalLink}`,
            desc && !desc.includes('\n') && `desc:${desc}`,
            notes && !notes.includes('\n') && `notes:${notes}`,
          ]
            .filter(Boolean)
            .join(' | ');

          const blocks = [
            desc?.includes('\n') ? `desc:\n\`\`\`\n${desc}\n\`\`\`` : null,
            notes?.includes('\n') ? `notes:\n\`\`\`\n${notes}\n\`\`\`` : null,
          ]
            .filter(Boolean)
            .join('\n');

          return `[${i + 1}] ${name}\n${fields}${blocks ? `\n${blocks}` : ''}`;
        });

        return {
          content: [
            {
              type: 'text',
              text: boundedText(`${data.length} building(s) found:\n\n${lines.join('\n\n')}`),
            },
          ],
        };
      },
    );

    server.registerTool(
      'get_bans',
      {
        title: 'Get Bans',
        description: 'Get the list of banned players from the Minecraft server.',
        inputSchema: z.object({}),
      },
      async () => {
        const data = await apiFetch(dataApiUrl('/bans'), isBanItemArray);

        if (data.length === 0) {
          return {
            content: [{ type: 'text', text: 'No banned players.' }],
          };
        }

        const now = Date.now();
        const lines = data.map((ban) => {
          const expiry =
            ban.isPermanent || !ban.expiresAt
              ? 'permanent'
              : new Date(ban.expiresAt) > new Date(now)
                ? `expires:${ban.expiresAt}`
                : 'expired';

          return `${ban.playerName} | uuid:${ban.playerUuid} | by:${ban.bannedBy} | ${expiry} | reason:${ban.reason}`;
        });

        return {
          content: [
            { type: 'text', text: boundedText(`${data.length} ban(s):\n\n${lines.join('\n')}`) },
          ],
        };
      },
    );

    server.registerTool(
      'get_announcements',
      {
        title: 'Get Announcements',
        description: 'Get recent announcements from the Minecraft server.',
        inputSchema: z.object({
          count: z
            .number()
            .int()
            .positive()
            .max(50)
            .default(5)
            .describe('Number of announcements to return.'),
        }),
      },
      async ({ count }) => {
        const data = await apiFetch(dataApiUrl('/announcements'), isAnnouncementItemArray);

        if (data.length === 0) {
          return {
            content: [{ type: 'text', text: 'No announcements.' }],
          };
        }

        const lines = data.slice(0, count).map((a) => `[${a.timestamp}] ${a.content}`);

        return {
          content: [
            {
              type: 'text',
              text: boundedText(`${lines.length} announcement(s):\n\n${lines.join('\n')}`),
            },
          ],
        };
      },
    );

    server.registerTool(
      'search_wiki',
      {
        title: 'Search Wiki',
        description:
          'Search the Minecraft server wiki by keyword, alias, or command-style wording. This is keyword/fuzzy search, not vector search. ' +
          'Before calling this tool, the caller should usually rewrite the user intent into 3-5 interchangeable phrasings of the same question and send them together in searchPhrases. ' +
          'Do not send loosely related keywords or topic expansion. Good: "规则", "规范", "制度". Bad: "建筑 建造 模组 功能", "世界编辑 工具 网页". ' +
          'Supports exact substring, subsequence (e.g. "gmode" matches "/gamemode"), and multi-token matching ' +
          '(e.g. "规则 规范 制度" helps match the server rules page). Returns the full content of matched wiki sections and lets the caller control how many results are returned.',
        inputSchema: z.object({
          searchPhrases: z
            .array(z.string().trim().min(1).max(160))
            .min(1)
            .max(5)
            .describe(
              'Search with 1-5 interchangeable phrasings of the same question. Put the strongest wording first. Prefer 3-5 phrasings when the concept may be described in multiple ways, such as "规则", "规范", "制度"; "入服", "加入服务器", "白名单"; or "家", "home", "/sethome". Do not send loosely related keywords or topic expansion.',
            ),
          locale: z.enum(WIKI_LOCALES).optional().describe('Language locale (default: zh-CN)'),
          limit: z
            .number()
            .int()
            .positive()
            .max(20)
            .optional()
            .describe('Maximum number of results (default: 5, max: 20)'),
        }),
      },
      async ({ searchPhrases, locale, limit }) => {
        const loc = locale ?? 'zh-CN';
        const maxResults = limit ?? 5;
        const { searchIndex } = await getWikiContent(loc, 'public');
        const results = searchWikiBlocks(searchIndex, searchPhrases, maxResults);

        if (results.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `No wiki content found matching ${JSON.stringify(searchPhrases)} (${loc}).`,
              },
            ],
          };
        }

        const text = results
          .map(
            (result) =>
              `[${result.path}]\n${new URL(result.url, SITE_URL).href}\n\n${result.content}`,
          )
          .join('\n\n---\n\n');

        return { content: [{ type: 'text', text: boundedText(text) }] };
      },
    );
  },
  { verboseLogs: false, maxSubscriptions: 0 },
);

function boundedText(text: string): string {
  return text.length <= 64_000 ? text : `${text.slice(0, 64_000)}\n[Output truncated]`;
}
