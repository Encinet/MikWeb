import 'server-only';

import type { ReactNode } from 'react';
import { SITE_NAME } from '@/shared/config/site-config';
import {
  SOCIAL_IMAGE_BRAND_LAYOUT,
  SOCIAL_IMAGE_COLORS,
  SOCIAL_IMAGE_SIZE,
} from '@/site/seo/social-image/social-image-config';

export function SocialImageCanvas({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: SOCIAL_IMAGE_COLORS.background,
        color: SOCIAL_IMAGE_COLORS.text,
        fontFamily: 'Noto Sans SC',
      }}
    >
      {children}
    </div>
  );
}

export function SocialImageBackdrop({ image }: { image: string }) {
  return (
    // biome-ignore lint/performance/noImgElement: ImageResponse renders a standalone image.
    <img
      src={image}
      alt=""
      width={SOCIAL_IMAGE_SIZE.width}
      height={SOCIAL_IMAGE_SIZE.height}
      style={{ position: 'absolute', top: 0, left: 0, objectFit: 'cover' }}
    />
  );
}

export function SocialImageBrand({
  logo,
  color = SOCIAL_IMAGE_COLORS.brand,
  outline,
}: {
  logo: string;
  color?: string;
  outline?: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: SOCIAL_IMAGE_BRAND_LAYOUT.gap,
        fontSize: SOCIAL_IMAGE_BRAND_LAYOUT.fontSize,
        fontWeight: 700,
        color,
      }}
    >
      {/* biome-ignore lint/performance/noImgElement: ImageResponse renders a standalone image. */}
      <img
        src={logo}
        alt=""
        width={SOCIAL_IMAGE_BRAND_LAYOUT.logoSize}
        height={SOCIAL_IMAGE_BRAND_LAYOUT.logoSize}
      />
      <span style={outline ? { WebkitTextStroke: `1.5px ${outline}` } : undefined}>
        {SITE_NAME}
      </span>
    </div>
  );
}
