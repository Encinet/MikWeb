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
  | 'Layers'
  | 'ScrollText';

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
