import type { AppLocale } from '@/shared/i18n/routing';

export type WikiSectionId = string;
export type WikiSectionGroupId = string;

export type WikiLocale = AppLocale;

export type WikiSectionIcon =
  | 'Home'
  | 'Wrench'
  | 'Shield'
  | 'Users'
  | 'Zap'
  | 'BookOpen'
  | 'Code'
  | 'GitPullRequest'
  | 'ClipboardList'
  | 'Layers';

export type WikiAccess = 'public' | 'staff';

export interface WikiSectionDefinition {
  id: WikiSectionId;
  icon: WikiSectionIcon;
  label: string;
  description: string;
  groupId: WikiSectionGroupId;
  groupLabel: string;
  groupOrder: number;
  order: number;
  access: WikiAccess;
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

export interface WikiContentBundle {
  compiled: Record<string, string>;
  sections: WikiSectionDefinition[];
  sectionGroups: WikiSectionGroupDefinition[];
  content: WikiSectionContentMap;
  outlines: WikiSectionOutlineMap;
  searchIndex: SearchableWikiBlock[];
}

export interface WikiSectionPayload {
  id: WikiSectionId;
  compiled: string;
  outline: WikiSectionOutlineItem[];
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
