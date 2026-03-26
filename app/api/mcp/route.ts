import fs from 'fs/promises';
import GithubSlugger from 'github-slugger';
import { createMcpHandler } from 'mcp-handler';
import path from 'path';
import { z } from 'zod';

import { WIKI_LOCALES, WIKI_SECTIONS } from '@/lib/wiki';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

function fuzzyMatch(query: string, text: string): { matched: boolean; score: number } {
  const q = query.toLowerCase();
  const t = text.toLowerCase();

  if (t.includes(q)) return { matched: true, score: 3 };

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
    return { matched: true, score: 2 + maxConsecutive / q.length };
  }

  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length > 1) {
    const allFound = tokens.every((tok) => t.includes(tok));
    if (allFound) return { matched: true, score: 1 + tokens.length * 0.1 };
  }

  if (tokens.some((tok) => tok.length >= 2 && t.includes(tok))) {
    return { matched: true, score: 0.5 };
  }

  return { matched: false, score: 0 };
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')   // [text](url) → text
    .replace(/`{1,3}([^`]*)`{1,3}/g, '$1')     // `code` → code
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')   // **bold** / *italic*
    .replace(/_{1,2}([^_]+)_{1,2}/g, '$1')     // __bold__ / _italic_
    .replace(/^>\s*/gm, '')                     // blockquotes
    .replace(/^[-*+]\s+/gm, '')                // unordered list markers
    .replace(/^\d+\.\s+/gm, '')               // ordered list markers
    .trim();
}

// Wraps fetch with error handling; throws on non-ok or network failure
async function apiFetch(url: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch (err) {
    throw new Error(`Network error fetching ${url}: ${(err as Error).message}`);
  }
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching ${url}`);
  }
  return response.json();
}

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
        const data = await apiFetch(new URL('/api/players', BASE_URL).href);
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
        const data = await apiFetch(new URL('/api/buildings', BASE_URL).href);
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
        const data = await apiFetch(new URL('/api/bans', BASE_URL).href);
        return {
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        };
      }
    );

    server.registerTool(
      'get_announcements',
      {
        title: 'Get Announcements',
        description: 'Get recent announcements from the Minecraft server. Returns announcement content and timestamp (ISO 8601).',
        inputSchema: {
          count: z.number().int().positive().optional().describe('Number of announcements to return (default: 5)'),
        },
      },
      async ({ count }) => {
        const data = await apiFetch(new URL('/api/announcements', BASE_URL).href);
        const n = count ?? 5;
        const sliced = Array.isArray(data) ? data.slice(0, n) : data;
        return {
          content: [{ type: 'text', text: JSON.stringify(sliced, null, 2) }],
        };
      }
    );

    server.registerTool(
      'search_wiki',
      {
        title: 'Search Wiki',
        description:
          'Search the Minecraft server wiki by keyword. Supports fuzzy matching: exact substring, ' +
          'subsequence (e.g. "gmde" matches "gamemode"), and multi-token (e.g. "home set" matches "/sethome"). ' +
          'Optionally restrict to a single section and control how many results are returned.',
        inputSchema: {
          query: z.string().describe('Search keyword or phrase'),
          locale: z
            .enum(WIKI_LOCALES)
            .optional()
            .describe('Language locale (default: zh-CN)'),
          limit: z
            .number()
            .int()
            .positive()
            .max(20)
            .optional()
            .describe('Maximum number of results (default: 5, max: 20)'),
        },
      },
      async ({ query, locale, limit }) => {
        const loc = locale ?? 'zh-CN';
        const maxResults = limit ?? 5;
        const contentDir = path.join(process.cwd(), 'content', loc);
        const sectionsToSearch = WIKI_SECTIONS;

        const fileResults = await Promise.allSettled(
          sectionsToSearch.map((sectionId) =>
            fs
              .readFile(path.join(contentDir, `${sectionId}.md`), 'utf-8')
              .then((raw) => ({ sectionId, raw }))
          )
        );

        type Result = { path: string; url: string; content: string; score: number };
        const results: Result[] = [];

        for (const fileResult of fileResults) {
          if (fileResult.status === 'rejected') continue;
          const { sectionId, raw } = fileResult.value;
          const slugger = new GithubSlugger();

          // Line-by-line heading parser — handles all levels (##, ###, ####)
          // and correctly captures content that precedes the first heading.
          const blocks: { heading: string; body: string }[] = [];
          let currentHeading: string = sectionId; // pre-heading content uses the file name
          let currentBodyLines: string[] = [];

          for (const line of raw.split('\n')) {
            const m = line.match(/^(#{1,4})\s+(.+)/);
            if (m) {
              blocks.push({ heading: currentHeading, body: currentBodyLines.join('\n') });
              currentHeading = m[2].trim();
              currentBodyLines = [line];
            } else {
              currentBodyLines.push(line);
            }
          }
          blocks.push({ heading: currentHeading, body: currentBodyLines.join('\n') });

          for (const { heading, body } of blocks) {
            const cleanBody = stripMarkdown(body);

            const headMatch = fuzzyMatch(query, heading);
            const bodyMatch = fuzzyMatch(query, cleanBody);
            const score = Math.max(headMatch.score * 1.5, bodyMatch.score);

            if (!headMatch.matched && !bodyMatch.matched) continue;

            const slug = heading === sectionId ? '' : slugger.slug(heading);
            const hash = slug ? `#${slug}` : '';
            results.push({
              path: `${sectionId} › ${heading}`,
              url: `${BASE_URL}/${loc}/wiki?section=${sectionId}${hash}`,
              content: cleanBody,
              score,
            });
          }
        }

        if (results.length === 0) {
          return {
            content: [
              { type: 'text', text: `No wiki content found matching "${query}" (${loc}).` },
            ],
          };
        }

        results.sort((a, b) => b.score - a.score);

        const MAX_CHARS = 2000;
        const text = results
          .slice(0, maxResults)
          .map((r) => {
            const truncated = r.content.length > MAX_CHARS;
            const body = truncated ? r.content.slice(0, MAX_CHARS) + '\n\n…(内容已截断，完整内容请访问网页)' : r.content;
            return `[${r.path}]\n${r.url}\n\n${body}`;
          })
          .join('\n\n---\n\n');

        return { content: [{ type: 'text', text }] };
      }
    );
  },
  {},
  { basePath: '/api', verboseLogs: true }
);

export { handler as GET, handler as POST };
