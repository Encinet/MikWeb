import fs from 'fs/promises';
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
        description: 'Search the Minecraft server wiki content by keyword. Supports fuzzy matching: exact substring, subsequence (e.g. "gmde" matches "gamemode"), and multi-token search (e.g. "home set" matches "/sethome").',
        inputSchema: {
          query: z.string().describe('Search keyword or phrase'),
          locale: z.enum(WIKI_LOCALES).optional().describe('Language locale (default: zh-CN)'),
        },
      },
      async ({ query, locale }) => {
        const loc = locale ?? 'zh-CN';
        const contentDir = path.join(process.cwd(), 'content', loc);

        // Read all section files in parallel instead of serially
        const fileResults = await Promise.allSettled(
          WIKI_SECTIONS.map((sectionId) =>
            fs
              .readFile(path.join(contentDir, `${sectionId}.md`), 'utf-8')
              .then((raw) => ({ sectionId, raw }))
          )
        );

        const results: { section: string; heading: string; excerpt: string; score: number }[] = [];

        for (const result of fileResults) {
          if (result.status === 'rejected') continue;
          const { sectionId, raw } = result.value;

          const blocks = raw.split(/\n(?=## )/);
          for (const block of blocks) {
            const lines = block.split('\n');
            const heading = lines[0].replace(/^#+\s*/, '').trim();
            const body = lines.slice(1).join('\n');

            const headMatch = fuzzyMatch(query, heading);
            const bodyMatch = fuzzyMatch(query, body);
            const score = Math.max(headMatch.score * 1.5, bodyMatch.score);

            if (!headMatch.matched && !bodyMatch.matched) continue;

            // Find excerpt anchor position in body
            const searchable = body.toLowerCase();
            const q = query.toLowerCase();
            let idx = searchable.indexOf(q);

            if (idx === -1) {
              // Fuzzy: find position of first matched query character
              let qi = 0;
              for (let ti = 0; ti < searchable.length && qi < q.length; ti++) {
                if (searchable[ti] === q[qi]) {
                  if (qi === 0) idx = ti; // anchor to first matched char
                  qi++;
                }
              }
            }

            let excerpt: string;
            if (idx >= 0) {
              const start = Math.max(0, idx - 60);
              const end = Math.min(body.length, idx + query.length + 120);
              excerpt =
                (start > 0 ? '...' : '') +
                body.slice(start, end).trim() +
                (end < body.length ? '...' : '');
            } else {
              excerpt = body.trim().slice(0, 300) + (body.trim().length > 300 ? '...' : '');
            }

            results.push({ section: sectionId, heading, excerpt, score });
          }
        }

        if (results.length === 0) {
          return {
            content: [{ type: 'text', text: `No wiki content found matching "${query}" (${loc}).` }],
          };
        }

        results.sort((a, b) => b.score - a.score);

        const text = results
          .map((r) => `[${r.section}] ${r.heading}\n${r.excerpt}`)
          .join('\n\n---\n\n');

        return {
          content: [{ type: 'text', text }],
        };
      }
    );
  },
  {},
  { basePath: '/api', verboseLogs: true }
);

export { handler as GET, handler as POST };
