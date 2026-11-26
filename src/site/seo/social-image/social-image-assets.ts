import 'server-only';

import { readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

import { SITE_APP_ICONS } from '@/shared/config/site-config';
import type { SocialImageCover } from '@/site/seo/site-pages';
import type { SocialImageBackdropStyle } from '@/site/seo/social-image/social-image-backdrop';
import { createSocialImageBackdrop } from '@/site/seo/social-image/social-image-backdrop';

const assets = new Map<string, ReturnType<typeof createSocialImageBackdrop>>();

// Literal paths let file tracing package only the covers used by the renderer.
const coverReaders = {
  city: () => readFile(join(process.cwd(), 'public/images/home/hero-city-daylight.webp')),
  library: () => readFile(join(process.cwd(), 'public/images/home/hero-library.webp')),
  map: () => readFile(join(process.cwd(), 'public/images/map/world-preview.webp')),
} satisfies Record<SocialImageCover, () => Promise<Buffer>>;

export function readSocialImageCover(cover: SocialImageCover) {
  return coverReaders[cover]();
}

export function readSocialImageBackdrop(cover: SocialImageCover, style: SocialImageBackdropStyle) {
  const key = `${cover}:${style}`;
  let asset = assets.get(key);
  if (!asset) {
    asset = readSocialImageCover(cover)
      .then((source) => createSocialImageBackdrop(source, style))
      .catch((error: unknown) => {
        assets.delete(key);
        throw error;
      });
    assets.set(key, asset);
  }
  return asset;
}

let logo: Promise<{ png: Buffer; dataUrl: string }> | undefined;

export function readSocialImageLogo() {
  logo ??= readFile(join(process.cwd(), 'public/brand/mik', basename(SITE_APP_ICONS[0].src)))
    .then((png) => ({ png, dataUrl: `data:image/png;base64,${png.toString('base64')}` }))
    .catch((error: unknown) => {
      logo = undefined;
      throw error;
    });
  return logo;
}
