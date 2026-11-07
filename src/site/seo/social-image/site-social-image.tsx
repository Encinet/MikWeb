import 'server-only';

import { ImageResponse } from 'next/og';
import type { AppLocale } from '@/shared/i18n/routing';
import { getSitePageContent } from '@/site/seo/site-page-metadata';
import type { SitePage } from '@/site/seo/site-pages';
import {
  readSocialImageBackdrop,
  readSocialImageLogo,
} from '@/site/seo/social-image/social-image-assets';
import {
  SOCIAL_IMAGE_COLORS,
  SOCIAL_IMAGE_SCENE_WIDTH,
  SOCIAL_IMAGE_SIZE,
} from '@/site/seo/social-image/social-image-config';
import { readSocialImageFonts } from '@/site/seo/social-image/social-image-font';
import {
  SocialImageBackdrop,
  SocialImageBrand,
  SocialImageCanvas,
} from '@/site/seo/social-image/social-image-layout';

export async function createSocialImage(locale: AppLocale, page: SitePage = 'home') {
  const content = await getSitePageContent(locale, page);
  const scene = Boolean(content.cover);
  const [fonts, logo, backdrop] = await Promise.all([
    readSocialImageFonts(),
    readSocialImageLogo(),
    readSocialImageBackdrop(
      content.cover ?? '/images/home/hero-city-daylight.webp',
      scene ? 'scene' : 'ambient',
    ),
  ]);

  return new ImageResponse(
    <SocialImageCanvas>
      <SocialImageBackdrop image={backdrop} />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: scene ? SOCIAL_IMAGE_SCENE_WIDTH : SOCIAL_IMAGE_SIZE.width,
          height: '100%',
          padding: '52px 60px',
        }}
      >
        <SocialImageBrand logo={logo} />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            justifyContent: 'center',
            gap: 24,
          }}
        >
          <div
            style={{
              display: 'block',
              fontSize: page === 'home' ? 76 : scene ? 88 : 96,
              fontWeight: 700,
              lineHeight: 1.16,
              letterSpacing: '-0.025em',
              whiteSpace: 'pre-wrap',
              textWrap: 'balance',
              lineClamp: 3,
            }}
          >
            {content.imageTitle}
          </div>
          <div
            style={{
              display: 'block',
              fontSize: 48,
              lineHeight: 1.35,
              textWrap: 'pretty',
              color: SOCIAL_IMAGE_COLORS.secondary,
              maxWidth: scene ? 650 : 1020,
              lineClamp: 2,
            }}
          >
            {content.imageDescription}
          </div>
        </div>
      </div>
    </SocialImageCanvas>,
    {
      ...SOCIAL_IMAGE_SIZE,
      fonts,
    },
  );
}
