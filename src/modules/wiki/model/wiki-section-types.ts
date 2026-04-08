export type WikiSectionId = string;
export type WikiSectionGroupId = string;

export type WikiLocale = 'zh-CN' | 'en';

export type WikiSectionIcon = 'Home' | 'Wrench' | 'Shield' | 'Users' | 'Zap';

export interface WikiSectionDefinition {
  id: WikiSectionId;
  icon: WikiSectionIcon;
  label: string;
  description: string;
  groupId: WikiSectionGroupId;
  groupLabel: string;
  groupOrder: number;
  order: number;
}

export interface WikiSectionGroupDefinition {
  id: WikiSectionGroupId;
  label: string;
  sections: WikiSectionDefinition[];
}

export type WikiSectionContentMap = Record<string, string>;
export type WikiSectionOutlineMap = Record<string, WikiSectionOutlineItem[]>;

export interface WikiSectionFrontMatter {
  title: string;
  description: string;
  order: number;
  icon: WikiSectionIcon;
}

export interface WikiSectionDocument {
  section: WikiSectionDefinition;
  content: string;
  sourcePath: string;
}

export interface WikiSectionOutlineItem {
  heading: string;
  level: number;
  slug: string;
}

export interface MarkdownBlock {
  heading: string;
  level: number;
  slug: string;
  directRaw: string;
  subtreeRaw: string;
}

export interface PreparedQuery {
  lower: string;
  tokens: string[];
}

export type FuzzyMatchScore = number;

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
