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

export interface SearchableWikiBlock {
  sectionId: WikiSectionId;
  path: string;
  url: string;
  content: string;
  heading: string;
  slug: string;
  directText: string;
  subtreeText: string;
  searchableText: string;
  level: number;
}

export interface WikiSearchResult {
  sectionId: WikiSectionId;
  path: string;
  url: string;
  content: string;
  heading: string;
  slug: string;
  snippet: string;
  score: number;
}
