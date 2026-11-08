import 'server-only';

import type { OverlayOptions } from 'sharp';
import sharp from 'sharp';
import {
  SOCIAL_IMAGE_SCENE_WIDTH,
  SOCIAL_IMAGE_SIZE,
} from '@/site/seo/social-image/social-image-config';
import {
  readBuildingSocialImagePalette,
  readSocialImageShade,
} from '@/site/seo/social-image/social-image-palette';

export type SocialImageBackdropStyle = 'scene' | 'ambient';
type BackdropStyle = SocialImageBackdropStyle | 'building';

function gradient(direction: 'horizontal' | 'vertical', color: string, stops: [number, number][]) {
  const { width, height } = SOCIAL_IMAGE_SIZE;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <defs><linearGradient id="fade" x1="0" y1="0" x2="${direction === 'horizontal' ? '1' : '0'}" y2="${direction === 'vertical' ? '1' : '0'}">
        ${stops.map(([offset, opacity]) => `<stop offset="${offset}%" stop-color="${color}" stop-opacity="${opacity}"/>`).join('')}
      </linearGradient></defs>
      <rect width="100%" height="100%" fill="url(#fade)"/>
    </svg>`,
  );
}

export async function frameSocialImagePhoto(
  source: Buffer,
  size: { width: number; height: number } = SOCIAL_IMAGE_SIZE,
) {
  const cover = await sharp(source)
    .resize(size.width, size.height, { fit: 'cover' })
    .png()
    .toBuffer();
  // Preserve the entire original image. The same image, blurred, fills any empty space.
  const [background, fitted] = await Promise.all([
    sharp(cover).blur(24).png().toBuffer(),
    sharp(source)
      .ensureAlpha()
      .resize(size.width, size.height, {
        fit: 'inside',
      })
      .png()
      .toBuffer({ resolveWithObject: true }),
  ]);
  const { width, height } = fitted.info;
  const edge = Math.min(12, width / 4, height / 4);
  const edgeMask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
        <defs><filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${(edge * 2) / 3}"/></filter></defs>
        <rect x="${edge}" y="${edge}" width="${width - edge * 2}" height="${height - edge * 2}" fill="white" filter="url(#soft)"/>
      </svg>`,
  );
  const foreground = await sharp(fitted.data)
    .composite([{ input: edgeMask, blend: 'dest-in' }])
    .png()
    .toBuffer();
  return sharp(background)
    .composite([{ input: foreground, gravity: 'centre' }])
    .png()
    .toBuffer();
}

async function framePhoto(source: Buffer, style: BackdropStyle) {
  if (style === 'building') return frameSocialImagePhoto(source);
  return sharp(source)
    .resize(SOCIAL_IMAGE_SIZE.width, SOCIAL_IMAGE_SIZE.height, { fit: 'cover' })
    .png()
    .toBuffer();
}

/** Precompose blur because ImageResponse does not support CSS filters. */
async function softenPhoto(photo: Buffer, style: BackdropStyle) {
  const vertical = style === 'building';
  const blurred = sharp(photo)
    .ensureAlpha()
    .blur(vertical ? 14 : 24);
  if (style === 'ambient') return blurred.png().toBuffer();
  const direction = vertical ? 'vertical' : 'horizontal';
  const blurMask = gradient(
    direction,
    '#ffffff',
    vertical
      ? [
          [0, 0],
          [64, 0],
          [82, 0.5],
          [100, 1],
        ]
      : [
          [0, 1],
          [36, 1],
          [58, 0.8],
          [82, 0],
          [100, 0],
        ],
  );
  return blurred
    .composite([{ input: blurMask, blend: 'dest-in' }])
    .png()
    .toBuffer();
}

async function encodeBackdrop(photo: Buffer, overlays: OverlayOptions[]) {
  const image = await sharp(photo).composite(overlays).jpeg({ quality: 90 }).toBuffer();
  return `data:image/jpeg;base64,${image.toString('base64')}`;
}

export async function createSocialImageBackdrop(source: Buffer, style: SocialImageBackdropStyle) {
  const photo = await framePhoto(source, style);
  const [shade, softLayer] = await Promise.all([
    readSocialImageShade(photo, {
      left: 0,
      top: 0,
      width: SOCIAL_IMAGE_SCENE_WIDTH,
      height: SOCIAL_IMAGE_SIZE.height,
    }),
    softenPhoto(photo, style),
  ]);
  return encodeBackdrop(photo, [
    { input: softLayer },
    {
      input: gradient(
        'horizontal',
        `rgb(${shade.join(',')})`,
        style === 'ambient'
          ? [
              [0, 0.95],
              [50, 0.88],
              [100, 0.78],
            ]
          : [
              [0, 0.96],
              [38, 0.94],
              [60, 0.82],
              [80, 0.28],
              [100, 0.06],
            ],
      ),
    },
  ]);
}

export async function createBuildingSocialImageBackdrop(source: Buffer) {
  const photo = await framePhoto(source, 'building');
  const [palette, softLayer] = await Promise.all([
    readBuildingSocialImagePalette(photo),
    softenPhoto(photo, 'building'),
  ]);
  return { image: await encodeBackdrop(photo, [{ input: softLayer }]), palette };
}
