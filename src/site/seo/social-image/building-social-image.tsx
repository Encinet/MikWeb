import 'server-only';

import { ImageResponse } from 'next/og';
import { getTranslations } from 'next-intl/server';
import { sortBuildersByWeight } from '@/modules/building/lib/building-builders';
import { getBuildingName } from '@/modules/building/lib/building-view-helpers';
import type { Building } from '@/modules/building/model/building-types';
import { readBuildingImage } from '@/modules/building/server/building-image';
import type { AppLocale } from '@/shared/i18n/routing';
import { readSocialImageLogo } from '@/site/seo/social-image/social-image-assets';
import { createBuildingSocialImageBackdrop } from '@/site/seo/social-image/social-image-backdrop';
import {
  SOCIAL_IMAGE_BRAND_LAYOUT,
  SOCIAL_IMAGE_COLORS,
  SOCIAL_IMAGE_SIZE,
} from '@/site/seo/social-image/social-image-config';
import { readSocialImageFonts } from '@/site/seo/social-image/social-image-font';
import {
  SocialImageBackdrop,
  SocialImageBrand,
  SocialImageCanvas,
} from '@/site/seo/social-image/social-image-layout';
import { DEFAULT_BUILDING_SOCIAL_IMAGE_PALETTE } from '@/site/seo/social-image/social-image-palette';

export async function createBuildingSocialImage(building: Building, locale: AppLocale) {
  const t = await getTranslations({ locale, namespace: 'buildings' });
  const [cover, fonts, logo] = await Promise.all([
    building.images[0]
      ? readBuildingImage(building.images[0]).then(createBuildingSocialImageBackdrop)
      : null,
    readSocialImageFonts(),
    readSocialImageLogo(),
  ]);
  const title = getBuildingName(building, locale).normalize('NFKC');
  const authors = sortBuildersByWeight(building.builders)
    .map((builder) => builder.name)
    .join(', ')
    .normalize('NFKC');
  const originalAuthor = building.source?.originalAuthor?.normalize('NFKC');
  const palette = cover?.palette ?? DEFAULT_BUILDING_SOCIAL_IMAGE_PALETTE;
  const { shade, captionOpacity: opacity } = palette;

  return new ImageResponse(
    <SocialImageCanvas>
      {cover ? <SocialImageBackdrop image={cover.image} /> : null}
      <div
        style={{
          display: 'flex',
          position: 'absolute',
          top: SOCIAL_IMAGE_BRAND_LAYOUT.top,
          left: SOCIAL_IMAGE_BRAND_LAYOUT.left,
        }}
      >
        <SocialImageBrand logo={logo} color={palette.brandColor} outline={palette.brandOutline} />
      </div>
      <div
        style={{
          display: 'flex',
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          flexDirection: 'column',
          gap: 18,
          padding: '96px 56px 48px',
          background: `linear-gradient(180deg, rgba(${shade},0) 0px, rgba(${shade},${opacity}) 80px, rgba(${shade},${Math.min(0.96, opacity + 0.14)}) 100%)`,
        }}
      >
        <div
          style={{
            display: 'block',
            fontSize: title.length > 40 ? 64 : title.length > 24 ? 72 : 80,
            fontWeight: 700,
            lineHeight: 1.16,
            letterSpacing: '-0.015em',
            textWrap: 'pretty',
            lineClamp: 2,
          }}
        >
          {title}
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            fontSize: 48,
            lineHeight: 1.25,
            color: SOCIAL_IMAGE_COLORS.secondary,
          }}
        >
          {authors ? <div style={{ display: 'block', lineClamp: 1 }}>{authors}</div> : null}
          {originalAuthor ? (
            <div style={{ display: 'block', lineClamp: 1 }}>
              {`${t('fields.originalAuthor')}: ${originalAuthor}`}
            </div>
          ) : null}
        </div>
      </div>
    </SocialImageCanvas>,
    {
      ...SOCIAL_IMAGE_SIZE,
      fonts,
    },
  );
}
