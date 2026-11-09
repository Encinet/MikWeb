// Metadata and image copy share the same translation keys and route definitions.
export const SITE_PAGES = {
  home: {
    sitemap: true,
    pathname: '',
    title: 'metadata.title',
    description: 'metadata.description',
    imageTitle: 'metadata.social.title',
    imageDescription: 'metadata.social.description',
    cover: '/images/home/hero-city-daylight.webp',
  },
  join: {
    sitemap: true,
    pathname: '/join',
    title: 'join.title',
    description: 'join.meta.description',
  },
  map: {
    sitemap: true,
    pathname: '/map',
    title: 'map.title',
    description: 'map.meta.description',
    imageDescription: 'map.meta.imageDescription',
    cover: '/images/map/world-preview.webp',
  },
  buildings: {
    sitemap: true,
    pathname: '/buildings',
    title: 'buildings.title',
    description: 'buildings.meta.description',
    imageDescription: 'buildings.meta.imageDescription',
    cover: '/images/home/hero-city-daylight.webp',
  },
  wiki: {
    sitemap: true,
    pathname: '/wiki',
    title: 'wiki.title',
    description: 'wiki.meta.description',
    imageDescription: 'wiki.meta.imageDescription',
    cover: '/images/home/hero-library.webp',
  },
  bans: {
    sitemap: true,
    pathname: '/bans',
    title: 'bans.title',
    description: 'bans.meta.description',
  },
  community: {
    sitemap: true,
    pathname: '/community/notices',
    title: 'communityBoard.title',
    description: 'communityBoard.meta.description',
  },
  mcp: {
    sitemap: true,
    pathname: '/mcp',
    title: 'mcp.title',
    description: 'mcp.description',
    imageDescription: 'mcp.subtitle',
  },
  pcl2: {
    sitemap: true,
    pathname: '/pcl2',
    title: 'pcl2.title',
    description: 'pcl2.subtitle',
    imageDescription: 'pcl2.imageDescription',
  },
  chat: { pathname: '/chat', title: 'chat.title', description: 'chat.description' },
  login: { pathname: '/login', title: 'auth.login.title', description: 'auth.login.subtitle' },
  account: {
    pathname: '/account',
    title: 'auth.account.title',
    description: 'auth.account.overview.title',
  },
  security: {
    pathname: '/account/security',
    title: 'auth.security.title',
    description: 'auth.security.subtitle',
  },
  submissions: {
    pathname: '/account/building-submissions',
    title: 'buildingSubmission.title',
    description: 'buildingSubmission.subtitle',
    imageDescription: 'buildingSubmission.imageDescription',
  },
} as const;

export type SitePage = keyof typeof SITE_PAGES;
export const SITE_PAGE_IDS = Object.keys(SITE_PAGES) as SitePage[];

export function isSitePage(value: string): value is SitePage {
  return Object.hasOwn(SITE_PAGES, value);
}

export const SITEMAP_PATHS = Object.values(SITE_PAGES)
  .filter((page) => 'sitemap' in page && page.sitemap)
  .map((page) => page.pathname);
