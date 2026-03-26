export const WIKI_SECTIONS = [
  'getting-started',
  'rules',
  'commands',
  'community',
  'tips',
] as const;

export const WIKI_LOCALES = ['zh-CN', 'en'] as const;

export type WikiSection = (typeof WIKI_SECTIONS)[number];
export type WikiLocale = (typeof WIKI_LOCALES)[number];
