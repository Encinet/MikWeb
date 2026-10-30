import type { MetadataRoute } from 'next';

import {
  SITE_DESCRIPTION,
  SITE_LOGO_PATH,
  SITE_NAME,
  SITE_TITLE,
} from '@/shared/config/site-config';
import { DEFAULT_ACCENT_COLOR } from '@/shared/config/theme-config';
import { getAccentProperties } from '@/site/theme/lib/accent-color';

export default function manifest(): MetadataRoute.Manifest {
  const background = getAccentProperties(DEFAULT_ACCENT_COLOR)['--palette-dark-bg'];
  return {
    name: SITE_TITLE,
    'short_name': SITE_NAME,
    description: SITE_DESCRIPTION,
    'start_url': '/',
    display: 'standalone',
    'background_color': background,
    'theme_color': background,
    icons: [
      {
        src: SITE_LOGO_PATH,
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
