import GithubSlugger from 'github-slugger';
import type { WikiSectionContentMap } from '@/modules/wiki/model/wiki-content-types';
import type {
  PreparedWikiQuery,
  SearchableWikiBlock,
  WikiMarkdownBlock,
  WikiSearchEntry,
  WikiSearchResult,
} from '@/modules/wiki/model/wiki-search-types';
import type { WikiLocale, WikiSectionId } from '@/modules/wiki/model/wiki-section-types';

export function prepareWikiQuery(query: string): PreparedWikiQuery {
  const lower = query.trim().toLowerCase();

  return {
    lower,
    tokens: lower.split(/\s+/).filter(Boolean),
  };
}

function fuzzyMatchWikiText(query: PreparedWikiQuery, normalizedText: string): number {
  const queryText = query.lower;

  if (!queryText || !normalizedText) return 0;
  if (normalizedText.includes(queryText)) return 3;

  let queryIndex = 0;
  let consecutive = 0;
  let maxConsecutive = 0;
  for (
    let textIndex = 0;
    textIndex < normalizedText.length && queryIndex < queryText.length;
    textIndex++
  ) {
    if (normalizedText[textIndex] === queryText[queryIndex]) {
      queryIndex++;
      consecutive++;
      maxConsecutive = Math.max(maxConsecutive, consecutive);
    } else {
      consecutive = 0;
    }
  }
  if (queryIndex === queryText.length) {
    return 2 + maxConsecutive / queryText.length;
  }

  const { tokens } = query;
  if (tokens.length > 1) {
    const allFound = tokens.every((token) => normalizedText.includes(token));
    if (allFound) return 1 + tokens.length * 0.1;
  }

  if (tokens.some((token) => token.length >= 2 && normalizedText.includes(token))) {
    return 0.5;
  }

  return 0;
}

export function normalizeWikiSearchPhrases(searchPhrases: string[]): PreparedWikiQuery[] {
  const uniqueQueries = new Set<string>();

  for (const phrase of searchPhrases) {
    const trimmed = phrase.trim();
    if (!trimmed) continue;
    uniqueQueries.add(trimmed);
  }

  return Array.from(uniqueQueries).map((item) => prepareWikiQuery(item));
}

function decodeWikiHtmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/** Retain readable Markdown for MCP consumers while removing layout-only JSX. */
export function formatWikiMdxForSearch(text: string): string {
  return text
    .replace(/<Card\b([^>]+)>/g, (_match, attributes: string) => {
      const title = attributes.match(/\btitle="([^"]+)"/)?.[1] ?? '';
      const href = attributes.match(/\bhref="([^"]+)"/)?.[1];
      return href ? `[${title}](${href})\n` : `${title}\n`;
    })
    .replace(/<(?:Callout|Step|Details|Tab|Definition)\b[^>]*\btitle="([^"]+)"[^>]*>/g, '**$1**\n')
    .replace(
      /<\/?(?:Callout|Steps|Step|Cards|Card|Details|Tabs|Tab|Definitions|Definition)\b[^>]*>/g,
      '',
    )
    .replace(/<(\/?)WikiTable>/g, '<$1table>');
}

export function stripWikiMarkdown(text: string): string {
  return formatWikiMdxForSearch(text)
    .replace(/\r\n?/g, '\n')
    .replace(/```([^\n]*)\n([\s\S]*?)```/g, (_, __, code: string) => code.trim())
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<\/(?:td|th)>/gi, ' | ')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&(?:lt|gt|amp|quot|#39);/g, (entity) => decodeWikiHtmlEntities(entity))
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

export function parseWikiMarkdownBlocks(sectionId: string, raw: string): WikiMarkdownBlock[] {
  const lines = raw.replace(/\r\n?/g, '\n').split('\n');
  let fence: { marker: string; length: number } | null = null;
  const headingMatches = lines
    .map((line, index) => {
      const fenceMatch = line.match(/^\s{0,3}(`{3,}|~{3,})(.*)$/);
      if (fenceMatch) {
        if (!fence) fence = { marker: fenceMatch[1][0], length: fenceMatch[1].length };
        else if (
          fenceMatch[1][0] === fence.marker &&
          fenceMatch[1].length >= fence.length &&
          !fenceMatch[2].trim()
        )
          fence = null;
        return null;
      }
      if (fence) return null;
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

export function buildWikiSearchIndex(
  locale: WikiLocale,
  content: WikiSectionContentMap,
  baseUrl?: string,
): SearchableWikiBlock[] {
  const blocks: SearchableWikiBlock[] = [];
  const normalizedBaseUrl = baseUrl?.replace(/\/$/, '') ?? '';

  for (const [sectionId, raw] of Object.entries(content) as [WikiSectionId, string][]) {
    const parsedBlocks = parseWikiMarkdownBlocks(sectionId, raw);
    const pageTitle = parsedBlocks.find((block) => block.level === 1)?.heading ?? sectionId;

    for (const block of parsedBlocks) {
      const directText = stripWikiMarkdown(block.directRaw);
      const subtreeText =
        block.subtreeRaw === block.directRaw ? directText : stripWikiMarkdown(block.subtreeRaw);
      const searchableText = subtreeText || directText;

      if (!searchableText && !block.heading) continue;

      const hash = block.slug ? `#${block.slug}` : '';
      const wikiPath = `/${locale}/wiki?section=${sectionId}${hash}`;

      blocks.push({
        sectionId,
        path: block.heading === pageTitle ? pageTitle : `${pageTitle} › ${block.heading}`,
        url: normalizedBaseUrl ? `${normalizedBaseUrl}${wikiPath}` : wikiPath,
        content: [
          `${'#'.repeat(block.level)} ${block.heading}`,
          formatWikiMdxForSearch(block.subtreeRaw),
        ]
          .filter(Boolean)
          .join('\n\n'),
        heading: block.heading,
        slug: block.slug,
        directText,
        subtreeText,
        searchableText,
        level: block.level,
      });
    }
  }

  return blocks;
}

function createWikiSearchSnippet(text: string, preparedQueries: PreparedWikiQuery[]): string {
  const normalizedText = text.replace(/\s+/g, ' ').trim();

  if (!normalizedText) return '';

  const lowerText = normalizedText.toLowerCase();
  let bestIndex = Number.POSITIVE_INFINITY;
  let bestLength = 0;

  for (const preparedQuery of preparedQueries) {
    const exactIndex = lowerText.indexOf(preparedQuery.lower);
    if (exactIndex >= 0 && exactIndex < bestIndex) {
      bestIndex = exactIndex;
      bestLength = preparedQuery.lower.length;
    }

    for (const token of preparedQuery.tokens) {
      if (!token) continue;
      const tokenIndex = lowerText.indexOf(token);
      if (tokenIndex >= 0 && tokenIndex < bestIndex) {
        bestIndex = tokenIndex;
        bestLength = token.length;
      }
    }
  }

  if (!Number.isFinite(bestIndex)) {
    return normalizedText.length > 180 ? `${normalizedText.slice(0, 177)}...` : normalizedText;
  }

  const start = Math.max(0, bestIndex - 42);
  const end = Math.min(normalizedText.length, bestIndex + bestLength + 110);
  const snippet = normalizedText.slice(start, end).trim();

  return `${start > 0 ? '...' : ''}${snippet}${end < normalizedText.length ? '...' : ''}`;
}

function bestWikiMatch(queries: PreparedWikiQuery[], text: string): number {
  if (!text) return 0;
  const normalized = text.toLowerCase();
  let score = 0;
  for (const query of queries) score = Math.max(score, fuzzyMatchWikiText(query, normalized));
  return score;
}

export function rankWikiBlocks<T extends WikiSearchEntry>(
  indexedBlocks: T[],
  preparedQueries: PreparedWikiQuery[],
  limit?: number,
) {
  if (preparedQueries.length === 0) return [];

  const ranked: { block: T; score: number }[] = [];

  for (const block of indexedBlocks) {
    const headScore = bestWikiMatch(preparedQueries, block.heading);
    const directScore = bestWikiMatch(preparedQueries, block.directText);
    const bodyScore =
      block.subtreeText && block.subtreeText !== block.directText
        ? bestWikiMatch(preparedQueries, block.subtreeText)
        : directScore;
    const hasDirectContent = block.directText.length > 0;
    const isContainerHeading = !hasDirectContent && Boolean(block.subtreeText);

    if (headScore <= 0 && directScore <= 0 && bodyScore <= 0) continue;

    const score =
      Math.max(headScore * 1.8, directScore * 1.2, bodyScore) +
      block.level * 0.1 +
      (hasDirectContent ? 0.15 : 0) -
      (isContainerHeading ? 0.2 : 0);

    ranked.push({ block, score });
  }

  ranked.sort((a, b) => b.score - a.score);

  const seen = new Set<string>();
  const unique = ranked.filter(({ block }) => {
    const key = `${block.path}\n${block.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return typeof limit === 'number' ? unique.slice(0, limit) : unique;
}

export function searchWikiBlocks(
  indexedBlocks: WikiSearchEntry[],
  searchPhrases: string[],
  limit?: number,
): WikiSearchResult[] {
  const queries = normalizeWikiSearchPhrases(searchPhrases);
  return rankWikiBlocks(indexedBlocks, queries, limit).map(({ block, score }) => ({
    sectionId: block.sectionId,
    path: block.path,
    url: block.url,
    heading: block.heading,
    slug: block.slug,
    snippet: createWikiSearchSnippet(block.directText || block.subtreeText || '', queries),
    score,
  }));
}
