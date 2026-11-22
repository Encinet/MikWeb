import type { WikiSectionId } from '@/modules/wiki/model/wiki-section-types';

export interface WikiMarkdownBlock {
  heading: string;
  level: number;
  slug: string;
  directRaw: string;
  subtreeRaw: string;
}

export interface PreparedWikiQuery {
  lower: string;
  tokens: string[];
}

export interface WikiSearchEntry {
  sectionId: WikiSectionId;
  path: string;
  url: string;
  heading: string;
  slug: string;
  directText: string;
  /** Omitted from the browser index when the direct text already covers the whole block. */
  subtreeText?: string;
  level: number;
}

export interface SearchableWikiBlock extends WikiSearchEntry {
  content: string;
  subtreeText: string;
  searchableText: string;
}

export interface WikiSearchResult {
  sectionId: WikiSectionId;
  path: string;
  url: string;
  heading: string;
  slug: string;
  snippet: string;
  score: number;
}
