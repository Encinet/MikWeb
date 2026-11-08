import 'server-only';

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import sharp from 'sharp';
import type { Building } from '@/modules/building/model/building-types';
import { readBuildingImage } from '@/modules/building/server/building-image';
import { SITE_NAME } from '@/shared/config/site-config';
import type { AppLocale } from '@/shared/i18n/routing';
import { getSitePageContent } from '@/site/seo/site-page-metadata';
import type { SitePage } from '@/site/seo/site-pages';
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
        // biome-ignore lint/performance/noImgElement: ImageResponse renders a standalone image.
        <img
          src={`data:image/jpeg;base64,${photo.toString('base64')}`}
          alt=""
          width={600}
          height={600}
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
        {/* biome-ignore lint/performance/noImgElement: ImageResponse renders a standalone image. */}
        <img src={logo} alt="" width={photo ? 80 : 192} height={photo ? 80 : 192} />
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

export async function createBuildingShareThumbnail(building: Building) {
  if (!building.images[0]) {
    const logo = await readSocialImageLogo();
    return new Response(
      new Uint8Array(
        await sharp({
          create: {
            ...SHARE_THUMBNAIL_SIZE,
            channels: 3,
            background: SOCIAL_IMAGE_COLORS.background,
          },
        })
          .composite([{ input: Buffer.from(logo.split(',')[1], 'base64'), gravity: 'centre' }])
          .png()
          .toBuffer(),
      ),
      { headers: { 'Content-Type': 'image/png' } },
    );
  }
  const photo = await frameSocialImagePhoto(
    await readBuildingImage(building.images[0]),
    SHARE_THUMBNAIL_SIZE,
  );
  return new Response(new Uint8Array(photo), { headers: { 'Content-Type': 'image/png' } });
}
