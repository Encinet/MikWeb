import 'server-only';

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { SITE_APP_ICONS } from '@/shared/config/site-config';
import type { SocialImageBackdropStyle } from '@/site/seo/social-image/social-image-backdrop';
import { createSocialImageBackdrop } from '@/site/seo/social-image/social-image-backdrop';

const assets = new Map<string, ReturnType<typeof createSocialImageBackdrop>>();

/** Only accepts the local assets defined by the site, never request-supplied paths. */
export function readSocialImageBackdrop(path: string, style: SocialImageBackdropStyle) {
  const key = `${path}:${style}`;
  let asset = assets.get(key);
  if (!asset) {
    asset = readFile(join(process.cwd(), 'public', path))
      .then((source) => createSocialImageBackdrop(source, style))
      .catch((error: unknown) => {
        assets.delete(key);
        throw error;
      });
    assets.set(key, asset);
  }
  return asset;
}

let logo: Promise<string> | undefined;

export function readSocialImageLogo() {
  logo ??= readFile(join(process.cwd(), 'public', SITE_APP_ICONS[0].src))
    .then((image) => `data:image/png;base64,${image.toString('base64')}`)
    .catch((error: unknown) => {
      logo = undefined;
      throw error;
    });
  return logo;
}
