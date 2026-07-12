export const SITE_URL = 'https://mcmik.top';
export const SITE_NAME = 'Mik Casual';
export const PCL2_HOMEPAGE_ROUTE = '/pcl2';
export const SITE_TITLE = `${SITE_NAME} - 创造休闲 Minecraft 服务器`;
export const SITE_DESCRIPTION = 'Mik Casual 是高版本Minecraft Java版本公益创造休闲服务器';
export const SITE_LONG_DESCRIPTION =
  'Mik Casual 是高版本Minecraft Java版公益创造休闲服务器，允许任意 Mod，专注于建筑创作与社区交流';
export const SITE_LOGO_PATH = '/mik-logo.svg';
export const SITE_FAVICON_PATH = '/site-favicon.ico';
export const SITE_KEYWORDS = [
  'Minecraft',
  'Server',
  'Mik',
  'Mik Casual',
  'Encinet',
  '创造服务器',
  '建筑',
  'Community',
  'Builds',
  'Creative',
] as const;

export const SITE_SOCIAL_PREVIEW_COPY = {
  'zh-CN': {
    brand: 'Mik 米客服务器',
    headline: '创造休闲 Minecraft 服务器',
    summary: '允许任意 Mod，专注于建筑创作与社区交流',
  },
  'zh-TW': {
    brand: 'Mik 米客伺服器',
    headline: '創造休閒 Minecraft 伺服器',
    summary: '允許任意 Mod，專注於建築創作與社群交流',
  },
  'zh-HK': {
    brand: 'Mik 米客伺服器',
    headline: '創造休閒 Minecraft 伺服器',
    summary: '允許任意 Mod，專注於建築創作與社群交流',
  },
  lzh: {
    brand: 'Mik 米客',
    headline: '創造休閒 Minecraft 伺服',
    summary: '容納諸模，專心營造，社羣往來',
  },
  en: {
    brand: 'Mik Casual',
    headline: 'Creative Casual Minecraft Server',
    summary: 'Mods allowed, built for builders, centered on community',
  },
} as const;

export const ORGANIZATION_NAME = 'Encinet';
export const ORGANIZATION_URL = 'https://encinet.netlify.app/';
export const SOURCE_CODE_URL = 'https://github.com/Encinet/MikWeb';
export const ORGANIZATION_DESCRIPTION = 'Encinet 团队管理的 Mik 品牌 Minecraft 服务器社区';
export const ORGANIZATION_LOGO_PATH = '/encinet-studio-logo.webp';
export const ORGANIZATION_LOGO_URL = 'https://avatars.githubusercontent.com/u/102745297?s=200&v=4';
export const ORGANIZATION_SOCIAL_LINKS = [
  'https://github.com/Encinet',
  'https://space.bilibili.com/650182011',
] as const;

export function getPcl2HomepagePath(locale: string): string {
  return `/${locale}${PCL2_HOMEPAGE_ROUTE}`;
}

export function getPcl2HomepageUrl(locale: string): string {
  return `${SITE_URL}${getPcl2HomepagePath(locale)}`;
}
