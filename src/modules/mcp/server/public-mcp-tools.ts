import 'server-only';

import { z } from 'zod';

import { isAnnouncementItemArray } from '@/modules/announcement/model/announcement-validation';
import { isBanItemArray } from '@/modules/ban/model/ban-validation';
import { sortBuildersByWeight } from '@/modules/building/lib/building-builders';
import { isBuildingCatalogResponse } from '@/modules/building/model/building-api';
import { isPlayerStatusResponse } from '@/modules/player/lib/player-status-api';
import { normalizeWikiSearchPhrases, rankWikiBlocks } from '@/modules/wiki/lib/wiki-search';
import { getPublicWikiSearchIndex } from '@/modules/wiki/server/public-wiki-search-index';
import { dataApiUrl } from '@/shared/api/data-api-url';
import { SITE_URL } from '@/shared/config/site-config';
import type { LocalizedText } from '@/shared/i18n/localized-text';
import { getLocalizedText } from '@/shared/i18n/localized-text';
import { type AppLocale, routing } from '@/shared/i18n/routing';
import { readLimitedJson } from '@/shared/server/limited-request-body';

async function fetchDataServiceJson<TResponse>(
  url: string,
  validate: (value: unknown) => value is TResponse,
  signal: AbortSignal,
): Promise<TResponse> {
  const response = await fetch(url, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]),
  });
  if (!response.ok) throw new Error('Data service unavailable');
  const data = await readLimitedJson(response, 1024 * 1024);
  if (!validate(data)) throw new Error('Invalid data service response');
  return data;
}

function defineTool<Schema extends z.ZodObject>(
  definition: { title: string; description: string; inputSchema: Schema },
  query: (input: z.output<Schema>, signal: AbortSignal) => Promise<string>,
) {
  return {
    ...definition,
    execute: (input: unknown, signal: AbortSignal) =>
      query(definition.inputSchema.parse(input), signal),
  };
}

export function createPublicMcpTools(defaultLocale: AppLocale) {
  return {
    get_players: defineTool(
      {
        title: 'Get Players',
        description: 'Get online players from the Minecraft server.',
        inputSchema: z.object({}),
      },
      async (_input, signal) => {
        const data = await fetchDataServiceJson(
          dataApiUrl('/players'),
          isPlayerStatusResponse,
          signal,
        );

        if (data.online === -1) return 'Server offline.';
        if (data.online === 0) return 'Server online, no players.';

        const playerList = data.players
          .map((player) => `${player.name} (UUID: ${player.uuid})`)
          .join('\n');

        return `There are currently ${data.online} player(s) online:\n\n${playerList}`;
      },
    ),

    get_buildings: defineTool(
      {
        title: 'Get Buildings',
        description:
          'Get the list of buildings from the Minecraft server. builders format: "name(contribution%)" sorted by contribution desc. Coordinates include the world name and x, y, z.',
        inputSchema: z.object({
          locale: z
            .enum(routing.locales)
            .default(defaultLocale)
            .describe('Locale for localized fields (e.g. zh-CN, en).'),
        }),
      },
      async ({ locale }, signal) => {
        const { buildings: data } = await fetchDataServiceJson(
          dataApiUrl('/buildings'),
          isBuildingCatalogResponse,
          signal,
        );

        if (data.length === 0) return 'No buildings found.';

        const resolve = (localized: LocalizedText): string => getLocalizedText(localized, locale);

        const lines = data.map((building, index) => {
          const name = resolve(building.name);
          const description = resolve(building.description);
          const notes = building.source?.notes ? resolve(building.source.notes) : null;
          const tags = building.tags?.map(resolve).filter(Boolean).join(',');
          const { world, x, y, z } = building.coordinates;

          const sortedBuilders = sortBuildersByWeight(building.builders);
          const showContribution =
            sortedBuilders.length > 1 &&
            sortedBuilders[0].weight !== sortedBuilders[sortedBuilders.length - 1].weight;
          const totalWeight = showContribution
            ? sortedBuilders.reduce((sum, builder) => sum + builder.weight, 0)
            : 0;
          const builders = sortedBuilders
            .map((builder) =>
              showContribution
                ? `${builder.name}(${Math.round((builder.weight / totalWeight) * 100)}%)`
                : builder.name,
            )
            .join(',');

          const fields = [
            `type:${building.buildType}`,
            `world:${world} x:${x} y:${y} z:${z}`,
            `date:${building.buildDate}`,
            builders && `builders:${builders}`,
            tags && `tags:${tags}`,
            building.source?.originalAuthor && `author:${building.source.originalAuthor}`,
            building.source?.originalLink && `source:${building.source.originalLink}`,
            description && !description.includes('\n') && `desc:${description}`,
            notes && !notes.includes('\n') && `notes:${notes}`,
          ]
            .filter(Boolean)
            .join(' | ');

          const blocks = [
            description?.includes('\n') ? `desc:\n\`\`\`\n${description}\n\`\`\`` : null,
            notes?.includes('\n') ? `notes:\n\`\`\`\n${notes}\n\`\`\`` : null,
          ]
            .filter(Boolean)
            .join('\n');

          return `[${index + 1}] ${name}\n${fields}${blocks ? `\n${blocks}` : ''}`;
        });

        return boundedText(`${data.length} building(s) found:\n\n${lines.join('\n\n')}`);
      },
    ),

    get_bans: defineTool(
      {
        title: 'Get Bans',
        description: 'Get the list of banned players from the Minecraft server.',
        inputSchema: z.object({}),
      },
      async (_input, signal) => {
        const data = await fetchDataServiceJson(dataApiUrl('/bans'), isBanItemArray, signal);

        if (data.length === 0) return 'No banned players.';

        const now = Date.now();
        const lines = data.map((ban) => {
          const expiry =
            ban.isPermanent || !ban.expiresAt
              ? 'permanent'
              : Date.parse(ban.expiresAt) > now
                ? `expires:${ban.expiresAt}`
                : 'expired';

          return `${ban.playerName} | uuid:${ban.playerUuid} | by:${ban.bannedBy} | ${expiry} | reason:${ban.reason}`;
        });

        return boundedText(`${data.length} ban(s):\n\n${lines.join('\n')}`);
      },
    ),

    get_announcements: defineTool(
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
      async ({ count }, signal) => {
        const data = await fetchDataServiceJson(
          dataApiUrl('/announcements'),
          isAnnouncementItemArray,
          signal,
        );

        if (data.length === 0) return 'No announcements.';

        const lines = data
          .slice(0, count)
          .map((announcement) => `[${announcement.timestamp}] ${announcement.content}`);

        return boundedText(`${lines.length} announcement(s):\n\n${lines.join('\n')}`);
      },
    ),

    search_wiki: defineTool(
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
          locale: z
            .enum(routing.locales)
            .optional()
            .describe(`Language locale (default: ${defaultLocale})`),
          limit: z
            .number()
            .int()
            .positive()
            .max(20)
            .optional()
            .describe('Maximum number of results (default: 5, max: 20)'),
        }),
      },
      async ({ searchPhrases, locale, limit }, signal) => {
        signal.throwIfAborted();
        const loc = locale ?? defaultLocale;
        const maxResults = limit ?? 5;
        const searchIndex = await getPublicWikiSearchIndex(loc);
        signal.throwIfAborted();
        const results = rankWikiBlocks(
          searchIndex,
          normalizeWikiSearchPhrases(searchPhrases),
          maxResults,
        );

        if (results.length === 0) {
          return `No wiki content found matching ${JSON.stringify(searchPhrases)} (${loc}).`;
        }

        const text = results
          .map(
            ({ block }) =>
              `[${block.path}]\n${new URL(block.url, SITE_URL).href}\n\n${block.content}`,
          )
          .join('\n\n---\n\n');

        return boundedText(text);
      },
    ),
  };
}

function boundedText(text: string): string {
  return text.length <= 64_000 ? text : `${text.slice(0, 64_000)}\n[Output truncated]`;
}
