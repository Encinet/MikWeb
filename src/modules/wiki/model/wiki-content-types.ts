import type { SearchableWikiBlock } from '@/modules/wiki/model/wiki-search-types';
import type {
  WikiSectionDefinition,
  WikiSectionGroupDefinition,
  WikiSectionId,
  WikiSectionOutlineItem,
} from '@/modules/wiki/model/wiki-section-types';

export type WikiSectionContentMap = Record<string, string>;

export type WikiSectionOutlineMap = Record<string, WikiSectionOutlineItem[]>;

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
