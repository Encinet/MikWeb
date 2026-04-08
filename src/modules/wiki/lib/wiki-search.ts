import GithubSlugger from 'github-slugger';

import type {
  FuzzyMatchScore,
  MarkdownBlock,
  PreparedQuery,
  SearchableWikiBlock,
  WikiLocale,
  WikiSearchResult,
  WikiSectionContentMap,
  WikiSectionId,
} from '@/modules/wiki/model/wiki-section-types';

export function prepareWikiQuery(query: string): PreparedQuery {
  const lower = query.trim().toLowerCase();

  return {
    lower,
    tokens: lower.split(/\s+/).filter(Boolean),
  };
}

export function fuzzyMatchWikiText(query: PreparedQuery, text: string): FuzzyMatchScore {
  const q = query.lower;
  const t = text.toLowerCase();

  if (!q || !t) return 0;
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
    const allFound = tokens.every((token) => t.includes(token));
    if (allFound) return 1 + tokens.length * 0.1;
  }

  if (tokens.some((token) => token.length >= 2 && t.includes(token))) {
    return 0.5;
  }

  return 0;
}

export function normalizeWikiSearchPhrases(searchPhrases: string[]): PreparedQuery[] {
  const uniqueQueries = new Set<string>();

  for (const phrase of searchPhrases) {
    const trimmed = phrase.trim();
    if (!trimmed) continue;
    uniqueQueries.add(trimmed);
  }

  return Array.from(uniqueQueries).map((item) => prepareWikiQuery(item));
}

export function stripWikiMarkdown(text: string): string {
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

export function parseWikiMarkdownBlocks(sectionId: string, raw: string): MarkdownBlock[] {
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
      const subtreeText = stripWikiMarkdown(block.subtreeRaw);
      const searchableText = subtreeText || directText;

      if (!searchableText && !block.heading) continue;

      const hash = block.slug ? `#${block.slug}` : '';
      const wikiPath = `/${locale}/wiki?section=${sectionId}${hash}`;

      blocks.push({
        sectionId,
        path: block.heading === pageTitle ? pageTitle : `${pageTitle} › ${block.heading}`,
        url: normalizedBaseUrl ? `${normalizedBaseUrl}${wikiPath}` : wikiPath,
        content: [`${'#'.repeat(block.level)} ${block.heading}`, block.subtreeRaw]
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

function createWikiSearchSnippet(text: string, preparedQueries: PreparedQuery[]): string {
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

export function searchWikiBlocks(
  indexedBlocks: SearchableWikiBlock[],
  searchPhrases: string[],
  limit?: number,
): WikiSearchResult[] {
  const preparedQueries = normalizeWikiSearchPhrases(searchPhrases);

  if (preparedQueries.length === 0) return [];

  const results: WikiSearchResult[] = [];

  for (const block of indexedBlocks) {
    let headScore = 0;
    let directScore = 0;
    let bodyScore = 0;

    for (const preparedQuery of preparedQueries) {
      headScore = Math.max(headScore, fuzzyMatchWikiText(preparedQuery, block.heading));
      directScore = Math.max(directScore, fuzzyMatchWikiText(preparedQuery, block.directText));
      bodyScore = Math.max(bodyScore, fuzzyMatchWikiText(preparedQuery, block.searchableText));
    }

    const hasDirectContent = block.directText.length > 0;
    const isContainerHeading = !hasDirectContent && block.subtreeText.length > 0;

    if (headScore <= 0 && directScore <= 0 && bodyScore <= 0) continue;

    const snippetSource = block.directText || block.subtreeText || block.searchableText;
    const score =
      Math.max(headScore * 1.8, directScore * 1.2, bodyScore) +
      block.level * 0.1 +
      (hasDirectContent ? 0.15 : 0) -
      (isContainerHeading ? 0.2 : 0);

    results.push({
      sectionId: block.sectionId,
      path: block.path,
      url: block.url,
      content: block.content,
      heading: block.heading,
      slug: block.slug,
      snippet: createWikiSearchSnippet(snippetSource, preparedQueries),
      score,
    });
  }

  results.sort((a, b) => b.score - a.score);

  const seen = new Set<string>();
  const uniqueResults = results.filter((result) => {
    const key = `${result.path}\n${result.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return typeof limit === 'number' ? uniqueResults.slice(0, limit) : uniqueResults;
}
