import 'server-only';

import type { Region } from 'sharp';
import sharp from 'sharp';
import {
  SOCIAL_IMAGE_BRAND_LAYOUT,
  SOCIAL_IMAGE_COLORS,
  SOCIAL_IMAGE_SIZE,
} from '@/site/seo/social-image/social-image-config';

type Rgb = [number, number, number];

interface BuildingSocialImagePalette {
  shade: string;
  captionOpacity: number;
  brandColor: string;
  brandOutline?: string;
}

function colorToRgb(color: string): Rgb {
  return [
    Number.parseInt(color.slice(1, 3), 16),
    Number.parseInt(color.slice(3, 5), 16),
    Number.parseInt(color.slice(5, 7), 16),
  ];
}

export const DEFAULT_BUILDING_SOCIAL_IMAGE_PALETTE: BuildingSocialImagePalette = {
  shade: colorToRgb(SOCIAL_IMAGE_COLORS.background).join(','),
  captionOpacity: 0.8,
  brandColor: SOCIAL_IMAGE_COLORS.brand,
};

function luminance(rgb: Rgb) {
  const linear = rgb.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

function contrast(first: number, second: number) {
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

async function sample(photo: Buffer, region: Region) {
  const data = await sharp(photo)
    .extract(region)
    .resize({ width: 128, withoutEnlargement: true })
    .toColourspace('srgb')
    .removeAlpha()
    .raw()
    .toBuffer();
  const pixels: Rgb[] = [];
  for (let i = 0; i < data.length; i += 3) {
    pixels.push([data[i], data[i + 1], data[i + 2]]);
  }
  return pixels;
}

export async function readSocialImageShade(photo: Buffer, region: Region): Promise<Rgb> {
  const { dominant } = await sharp(photo).extract(region).stats();
  // Keep the photograph's hue while limiting the shade to a dark, restrained range.
  return [dominant.r, dominant.g, dominant.b].map((channel) =>
    Math.round(6 + channel * 0.18),
  ) as Rgb;
}

function selectBrandInk(pixels: Rgb[]) {
  const brightness = pixels.map(luminance);
  const candidates = [SOCIAL_IMAGE_COLORS.brand, SOCIAL_IMAGE_COLORS.background].map(
    (color, index, colors) => {
      const ink = luminance(colorToRgb(color));
      const ratios = brightness.map((value) => contrast(ink, value)).sort((a, b) => a - b);
      // A low percentile catches mixed backgrounds that an average would conceal.
      return {
        color,
        outline: colors[1 - index],
        contrast: ratios[Math.floor(ratios.length * 0.1)],
      };
    },
  );
  candidates.sort((a, b) => b.contrast - a.contrast);
  return {
    brandColor: candidates[0].color,
    brandOutline: candidates[0].contrast < 4.5 ? candidates[0].outline : undefined,
  };
}

function selectCaptionOpacity(pixels: Rgb[], shade: Rgb) {
  const brightest = pixels
    .map((rgb) => ({ rgb, luminance: luminance(rgb) }))
    .reduce((a, b) => (a.luminance > b.luminance ? a : b));
  const secondary = luminance(colorToRgb(SOCIAL_IMAGE_COLORS.secondary));
  for (let percent = 35; percent <= 85; percent += 5) {
    const opacity = percent / 100;
    const background = shade.map(
      (channel, index) => channel * opacity + brightest.rgb[index] * (1 - opacity),
    ) as Rgb;
    if (contrast(secondary, luminance(background)) >= 6) return opacity;
  }
  return 0.85;
}

/** Sample the framed photo so the colors correspond to the areas behind the text. */
export async function readBuildingSocialImagePalette(
  photo: Buffer,
): Promise<BuildingSocialImagePalette> {
  const { width, height } = SOCIAL_IMAGE_SIZE;
  const { left, top, logoSize, gap, textWidth } = SOCIAL_IMAGE_BRAND_LAYOUT;
  const captionTop = Math.round(height * 0.4);
  const captionRegion = { left: 0, top: captionTop, width, height: height - captionTop };
  const [shade, caption, brand] = await Promise.all([
    readSocialImageShade(photo, captionRegion),
    sample(photo, captionRegion),
    sample(photo, { left: left + logoSize + gap, top, width: textWidth, height: logoSize }),
  ]);

  return {
    shade: shade.join(','),
    captionOpacity: selectCaptionOpacity(caption, shade),
    ...selectBrandInk(brand),
  };
}
