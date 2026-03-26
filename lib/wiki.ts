import type { WikiLocale, WikiSectionDefinition, WikiSectionId } from '@/lib/types';

export const WIKI_SECTIONS = [
  'getting-started',
  'rules',
  'commands',
  'community',
  'tips',
] as const satisfies readonly WikiSectionId[];

export const WIKI_LOCALES = ['zh-CN', 'en'] as const satisfies readonly WikiLocale[];

export const WIKI_SECTION_TRANSLATION_KEYS: Record<WikiSectionId, string> = {
  'getting-started': 'sections.gettingStarted',
  rules: 'sections.rules',
  commands: 'sections.commands',
  community: 'sections.community',
  tips: 'sections.tips',
};

export const WIKI_SECTION_ICONS: Record<WikiSectionId, WikiSectionDefinition['icon']> = {
  'getting-started': 'Home',
  rules: 'Shield',
  commands: 'Wrench',
  community: 'Users',
  tips: 'Zap',
};

export function isWikiSectionId(value: string): value is WikiSectionId {
  return WIKI_SECTIONS.some((sectionId) => sectionId === value);
}

export function isWikiLocale(value: string): value is WikiLocale {
  return WIKI_LOCALES.some((locale) => locale === value);
}
