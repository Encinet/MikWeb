import type { MetadataRoute } from 'next';

import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE } from '@/lib/site';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_TITLE,
    'short_name': SITE_NAME,
    description: SITE_DESCRIPTION,
    'start_url': '/',
    display: 'standalone',
    'background_color': '#0a0a0a',
    'theme_color': '#8b5cf6',
    icons: [
      {
        src: '/mik-standard-rounded.webp',
        sizes: 'any',
        type: 'image/webp',
      },
    ],
  };
}
