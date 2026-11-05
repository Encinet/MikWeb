import 'server-only';

import type { MetadataRoute } from 'next';
import { getMessages } from 'next-intl/server';
import { SITE_APP_ICONS, SITE_NAME } from '@/shared/config/site-config';
import { DEFAULT_ACCENT_COLOR } from '@/shared/config/theme-config';
import type { AppLocale } from '@/shared/i18n/routing';
import { getAccentProperties } from '@/site/theme/lib/accent-color';

export async function buildAppManifest(locale: AppLocale): Promise<MetadataRoute.Manifest> {
  const messages = await getMessages({ locale });
  const background = getAccentProperties(DEFAULT_ACCENT_COLOR)['--palette-dark-bg'];
  const shortcutIcons = [SITE_APP_ICONS[0]];

  return {
    id: '/',
    scope: '/',
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: messages.metadata.description,
    lang: locale,
    dir: 'ltr',
    start_url: `/${locale}`,
    display: 'standalone',
    background_color: background,
    theme_color: background,
    icons: SITE_APP_ICONS,
    shortcuts: [
      {
        name: messages.chat.title,
        description: messages.chat.description,
        url: `/${locale}/chat`,
        icons: shortcutIcons,
      },
      {
        name: messages.map.title,
        url: `/${locale}/map`,
        icons: shortcutIcons,
      },
      {
        name: messages.wiki.title,
        description: messages.wiki.meta.description,
        url: `/${locale}/wiki`,
        icons: shortcutIcons,
      },
    ],
    screenshots: [
      {
        src: `/images/app/${locale}/desktop.png`,
        sizes: '1440x900',
        type: 'image/png',
        form_factor: 'wide',
        label: messages.metadata.screenshots.desktop,
      },
      {
        src: `/images/app/${locale}/mobile.png`,
        sizes: '390x844',
        type: 'image/png',
        form_factor: 'narrow',
        label: messages.metadata.screenshots.mobile,
      },
    ],
  };
}
