import 'server-only';

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import sharp from 'sharp';
import type { BuildingWithImageUrls } from '@/modules/building/model/building-types';
import { SITE_NAME } from '@/shared/config/site-config';
import type { AppLocale } from '@/shared/i18n/routing';
import { getSitePageContent } from '@/site/seo/site-page-metadata';
import type { SitePage } from '@/site/seo/site-pages';
import { readBuildingImage } from '@/site/seo/social-image/read-building-image';
import { readSocialImageLogo } from '@/site/seo/social-image/social-image-assets';
import { frameSocialImagePhoto } from '@/site/seo/social-image/social-image-backdrop';
import {
  SHARE_THUMBNAIL_SIZE,
  SOCIAL_IMAGE_COLORS,
} from '@/site/seo/social-image/social-image-config';
import { readSocialImageFonts } from '@/site/seo/social-image/social-image-font';
import { SocialImageCanvas } from '@/site/seo/social-image/social-image-layout';

export async function createSiteShareThumbnail(locale: AppLocale, page: SitePage) {
  const content = await getSitePageContent(locale, page);
  const [fonts, logo, photo] = await Promise.all([
    readSocialImageFonts(),
    readSocialImageLogo(),
    content.cover
      ? readFile(join(process.cwd(), 'public', content.cover)).then((source) =>
          sharp(source)
            .resize(SHARE_THUMBNAIL_SIZE.width, SHARE_THUMBNAIL_SIZE.height, { fit: 'cover' })
            .jpeg({ quality: 85 })
            .toBuffer(),
        )
      : null,
  ]);

  return new ImageResponse(
    <SocialImageCanvas>
      {photo ? (
        <img
          src={`data:image/jpeg;base64,${photo.toString('base64')}`}
          alt=""
          width={SHARE_THUMBNAIL_SIZE.width}
          height={SHARE_THUMBNAIL_SIZE.height}
        />
      ) : null}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 40,
          background: photo
            ? 'linear-gradient(180deg, rgba(23,43,54,0.15) 40%, rgba(23,43,54,0.92) 100%)'
            : SOCIAL_IMAGE_COLORS.background,
        }}
      >
        <img src={logo.dataUrl} alt="" width={photo ? 80 : 192} height={photo ? 80 : 192} />
        <div
          style={{
            display: 'block',
            fontSize: 64,
            fontWeight: 700,
            lineHeight: 1.15,
            lineClamp: 2,
          }}
        >
          {page === 'home' ? SITE_NAME : content.title}
        </div>
      </div>
    </SocialImageCanvas>,
    { ...SHARE_THUMBNAIL_SIZE, fonts },
  );
}

export async function createBuildingShareThumbnail(building: BuildingWithImageUrls) {
  const cover = building.images[0];
  if (cover) {
    const source = await readBuildingImage(cover.webp);
    return new Uint8Array(await frameSocialImagePhoto(source, SHARE_THUMBNAIL_SIZE));
  }

  const { png } = await readSocialImageLogo();
  const image = await sharp({
    create: {
      ...SHARE_THUMBNAIL_SIZE,
      channels: 3,
      background: SOCIAL_IMAGE_COLORS.background,
    },
  })
    .composite([{ input: png, gravity: 'centre' }])
    .png()
    .toBuffer();
  return new Uint8Array(image);
}
