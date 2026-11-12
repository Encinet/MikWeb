export const SITE_URL = 'https://mcmik.top';
export const SITE_HOSTNAME = new URL(SITE_URL).hostname;
export const MINECRAFT_SERVER_ADDRESS = 'mcmik.top';
export const SITE_NAME = 'Mik Casual';
// Compact wordmarks use the short name; titles, metadata and print use the full name.
export const SITE_SHORT_NAME = 'Mik';
export const SITE_LOGO_PATH = '/brand/mik/logo.svg';
export const SITE_FAVICON_PATH = '/brand/mik/favicon.ico';
export const SITE_APPLE_ICON_PATH = '/brand/mik/apple-touch-icon.png';
export const SITE_APP_ICONS = [
  ...[192, 512].map((size) => ({
    src: `/brand/mik/icon-${size}.png`,
    sizes: `${size}x${size}`,
    type: 'image/png',
    purpose: 'any' as const,
  })),
  {
    src: '/brand/mik/icon-maskable-1024.png',
    sizes: '1024x1024',
    type: 'image/png',
    purpose: 'maskable' as const,
  },
];
export const SITE_NOTIFICATION_ICON_PATH = SITE_APP_ICONS[0].src;
export const ORGANIZATION_NAME = 'Encinet';
export const SITE_TRANSLATION_VALUES = {
  siteName: SITE_NAME,
  organizationName: ORGANIZATION_NAME,
  siteHost: SITE_HOSTNAME,
} as const;
export const ORGANIZATION_URL = 'https://encinet.netlify.app/';
export const SOURCE_CODE_URL = 'https://github.com/Encinet/MikWeb';
export const ORGANIZATION_LOGO_PATH = '/brand/encinet/logo.webp';
export const ORGANIZATION_LOGO_URL = 'https://avatars.githubusercontent.com/u/102745297?s=200&v=4';
export const ORGANIZATION_SOCIAL_LINKS = [
  'https://github.com/Encinet',
  'https://space.bilibili.com/650182011',
] as const;
