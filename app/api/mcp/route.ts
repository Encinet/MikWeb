import fs from 'node:fs/promises';
import path from 'node:path';
import GithubSlugger from 'github-slugger';
import { createMcpHandler } from 'mcp-handler';
import { z } from 'zod';

import type {
  AnnouncementsApiResponse,
  BansApiResponse,
  BuildingsApiResponse,
  FuzzyMatchScore,
  LocalizedText,
  MarkdownBlock,
  PlayerOnlinePayload,
  PreparedQuery,
  SearchableWikiBlock,
  WikiLocale,
  WikiSearchResult,
} from '@/lib/types';
import { WIKI_LOCALES, WIKI_SECTIONS } from '@/lib/wiki';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

const wikiIndexCache = new Map<string, Promise<SearchableWikiBlock[]>>();

function prepareQuery(query: string): PreparedQuery {
  const lower = query.trim().toLowerCase();

  return {
    lower,
    tokens: lower.split(/\s+/).filter(Boolean),
  };
}

function fuzzyMatch(query: PreparedQuery, text: string): FuzzyMatchScore {
  const q = query.lower;
  const t = text.toLowerCase();

  if (t.includes(q)) return 3;

  let qi = 0;
  let consecutive = 0;
  let maxConsecutive = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      qi++;
      consecutive++;
      maxConsecutive = Math.max(maxConsecutive, consecutive);
    } else {
      consecutive = 0;
    }
  }
  if (qi === q.length) {
    return 2 + maxConsecutive / q.length;
  }

  const { tokens } = query;
  if (tokens.length > 1) {
    const allFound = tokens.every((tok) => t.includes(tok));
    if (allFound) return 1 + tokens.length * 0.1;
  }

  if (tokens.some((tok) => tok.length >= 2 && t.includes(tok))) {
    return 0.5;
  }

  return 0;
}

function normalizeWikiSearchPhrases(searchPhrases: string[]): PreparedQuery[] {
  const uniqueQueries = new Set<string>();

  for (const phrase of searchPhrases) {
    const trimmed = phrase.trim();
    if (!trimmed) continue;
    uniqueQueries.add(trimmed);
  }

  return Array.from(uniqueQueries).map((item) => prepareQuery(item));
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/```([^\n]*)\n([\s\S]*?)```/g, (_, __, code: string) => code.trim())
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();

      if (!trimmed) return '';
      if (/^\|?[-:\s|]+\|?$/.test(trimmed)) return '';

      if (trimmed.includes('|')) {
        const cells = trimmed
          .split('|')
          .map((cell) => cell.trim())
          .filter(Boolean);

        if (cells.length > 0) return cells.join(' | ');
      }

      return trimmed
        .replace(/^#{1,6}\s+/, '')
        .replace(/^>\s?/, '')
        .replace(/^[-*+]\s\[[ xX]\]\s+/, '')
        .replace(/^[-*+]\s+/, '')
        .replace(/^\d+\.\s+/, '')
        .replace(/`{1,3}([^`]*)`{1,3}/g, '$1')
        .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
        .replace(/_{1,3}([^_]+)_{1,3}/g, '$1');
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseMarkdownBlocks(sectionId: string, raw: string): MarkdownBlock[] {
  const lines = raw.replace(/\r\n?/g, '\n').split('\n');
  const headingMatches = lines
    .map((line, index) => {
      const match = line.match(/^(#{1,4})\s+(.+?)\s*#*\s*$/);
      if (!match) return null;

      return {
        index,
        level: match[1].length,
        heading: match[2].trim(),
      };
    })
    .filter(
      (
        value,
      ): value is {
        index: number;
        level: number;
        heading: string;
      } => value !== null,
    );

  if (headingMatches.length === 0) {
    return [
      {
        heading: sectionId,
        level: 1,
        slug: '',
        directRaw: raw.trim(),
        subtreeRaw: raw.trim(),
      },
    ];
  }

  const slugger = new GithubSlugger();

  return headingMatches.map((current, index) => {
    const nextHeadingLine = headingMatches[index + 1]?.index ?? lines.length;
    let nextSameOrHigherLine = lines.length;

    for (let i = index + 1; i < headingMatches.length; i++) {
      if (headingMatches[i].level <= current.level) {
        nextSameOrHigherLine = headingMatches[i].index;
        break;
      }
    }

    return {
      heading: current.heading,
      level: current.level,
      slug: slugger.slug(current.heading),
      directRaw: lines
        .slice(current.index + 1, nextHeadingLine)
        .join('\n')
        .trim(),
      subtreeRaw: lines
        .slice(current.index + 1, nextSameOrHigherLine)
        .join('\n')
        .trim(),
    };
  });
}

async function buildWikiIndex(locale: WikiLocale): Promise<SearchableWikiBlock[]> {
  const contentDir = path.join(process.cwd(), 'content', locale);
  const fileResults = await Promise.all(
    WIKI_SECTIONS.map((sectionId) =>
      fs
        .readFile(path.join(contentDir, `${sectionId}.md`), 'utf-8')
        .then((raw) => ({ sectionId, raw }))
        .catch(() => null),
    ),
  );

  const blocks: SearchableWikiBlock[] = [];

  for (const fileResult of fileResults) {
    if (!fileResult) continue;

    const { sectionId, raw } = fileResult;
    const parsedBlocks = parseMarkdownBlocks(sectionId, raw);
    const pageTitle = parsedBlocks.find((block) => block.level === 1)?.heading ?? sectionId;

    for (const block of parsedBlocks) {
      const directText = stripMarkdown(block.directRaw);
      const subtreeText = stripMarkdown(block.subtreeRaw);
      const searchableText = subtreeText || directText;

      if (!searchableText && !block.heading) continue;

      const hash = block.slug ? `#${block.slug}` : '';
      blocks.push({
        path: block.heading === pageTitle ? pageTitle : `${pageTitle} › ${block.heading}`,
        url: `${BASE_URL}/${locale}/wiki?section=${sectionId}${hash}`,
        content: [`${'#'.repeat(block.level)} ${block.heading}`, block.subtreeRaw]
          .filter(Boolean)
          .join('\n\n'),
        heading: block.heading,
        directText,
        subtreeText,
        searchableText,
        level: block.level,
      });
    }
  }

  return blocks;
}

function getWikiIndex(locale: WikiLocale): Promise<SearchableWikiBlock[]> {
  const cached = wikiIndexCache.get(locale);
  if (cached) return cached;

  const pending = buildWikiIndex(locale).catch((error) => {
    wikiIndexCache.delete(locale);
    throw error;
  });

  wikiIndexCache.set(locale, pending);
  return pending;
}

// Wraps fetch with error handling; throws on non-ok or network failure
async function apiFetch<TResponse>(url: string): Promise<TResponse> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch (err) {
    throw new Error(`Network error fetching ${url}: ${(err as Error).message}`);
  }
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching ${url}`);
  }
  return (await response.json()) as TResponse;
}

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      'get_players',
      {
        title: 'Get Players',
        description: 'Get online players from the Minecraft server.',
        inputSchema: {},
      },
      async () => {
        const data: PlayerOnlinePayload = await apiFetch(
          new URL('/api/players/online', BASE_URL).href,
        );

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
          'Get the list of buildings from the Minecraft server. builders format: "name(contribution%)" sorted by contribution desc. pos format: x y z (Minecraft coordinates).',
        inputSchema: {
          locale: z
            .string()
            .default('zh-CN')
            .describe('Locale for localized fields (e.g. zh-CN, en).'),
        },
      },
      async ({ locale }) => {
        const data: BuildingsApiResponse = await apiFetch(new URL('/api/buildings', BASE_URL).href);

        if (data.length === 0) {
          return {
            content: [{ type: 'text', text: 'No buildings found.' }],
          };
        }

        const resolve = (localized: LocalizedText): string =>
          localized[locale] ?? localized['zh-CN'] ?? Object.values(localized)[0] ?? '';

        const lines = data.map((b, i) => {
          const name = resolve(b.name);
          const desc = resolve(b.description);
          const notes = b.source?.notes ? resolve(b.source.notes) : null;
          const tags = b.tags?.map(resolve).filter(Boolean).join(',');
          const { x, y, z } = b.coordinates;

          const sortedBuilders = b.builders.sort((a, b) => b.weight - a.weight);
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
            `x:${x} y:${y} z:${z}`,
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
            { type: 'text', text: `${data.length} building(s) found:\n\n${lines.join('\n\n')}` },
          ],
        };
      },
    );

    server.registerTool(
      'get_bans',
      {
        title: 'Get Bans',
        description: 'Get the list of banned players from the Minecraft server.',
        inputSchema: {},
      },
      async () => {
        const data: BansApiResponse = await apiFetch(new URL('/api/bans', BASE_URL).href);

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
          content: [{ type: 'text', text: `${data.length} ban(s):\n\n${lines.join('\n')}` }],
        };
      },
    );

    server.registerTool(
      'get_announcements',
      {
        title: 'Get Announcements',
        description: 'Get recent announcements from the Minecraft server.',
        inputSchema: {
          count: z
            .number()
            .int()
            .positive()
            .default(5)
            .describe('Number of announcements to return.'),
        },
      },
      async ({ count }) => {
        const data: AnnouncementsApiResponse = await apiFetch(
          new URL('/api/announcements', BASE_URL).href,
        );

        if (data.length === 0) {
          return {
            content: [{ type: 'text', text: 'No announcements.' }],
          };
        }

        const lines = data.slice(0, count).map((a) => `[${a.timestamp}] ${a.content}`);

        return {
          content: [
            { type: 'text', text: `${lines.length} announcement(s):\n\n${lines.join('\n')}` },
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
        inputSchema: {
          searchPhrases: z
            .array(z.string())
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
        },
      },
      async ({ searchPhrases, locale, limit }) => {
        const loc = locale ?? 'zh-CN';
        const maxResults = limit ?? 5;
        const preparedQueries = normalizeWikiSearchPhrases(searchPhrases);
        const indexedBlocks = await getWikiIndex(loc);
        const results: WikiSearchResult[] = [];

        for (const block of indexedBlocks) {
          let headScore = 0;
          let directScore = 0;
          let bodyScore = 0;

          for (const preparedQuery of preparedQueries) {
            headScore = Math.max(headScore, fuzzyMatch(preparedQuery, block.heading));
            directScore = Math.max(directScore, fuzzyMatch(preparedQuery, block.directText));
            bodyScore = Math.max(bodyScore, fuzzyMatch(preparedQuery, block.searchableText));
          }

          const hasDirectContent = block.directText.length > 0;
          const isContainerHeading = !hasDirectContent && block.subtreeText.length > 0;

          if (headScore <= 0 && directScore <= 0 && bodyScore <= 0) continue;

          const score =
            Math.max(headScore * 1.8, directScore * 1.2, bodyScore) +
            block.level * 0.1 +
            (hasDirectContent ? 0.15 : 0) -
            (isContainerHeading ? 0.2 : 0);

          results.push({
            path: block.path,
            url: block.url,
            content: block.content,
            score,
          });
        }

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

        results.sort((a, b) => b.score - a.score);

        const seen = new Set<string>();
        const uniqueResults = results.filter((result) => {
          const key = `${result.path}\n${result.url}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        const text = uniqueResults
          .slice(0, maxResults)
          .map((result) => `[${result.path}]\n${result.url}\n\n${result.content}`)
          .join('\n\n---\n\n');

        return { content: [{ type: 'text', text }] };
      },
    );
  },
  {},
  { basePath: '/api', verboseLogs: true },
);

export { handler as GET, handler as POST };
