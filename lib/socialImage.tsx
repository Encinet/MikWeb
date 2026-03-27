import { ImageResponse } from 'next/og';

import type { AppLocale } from '@/i18n/routing';
import { SITE_SOCIAL_PREVIEW_COPY } from '@/lib/site';

export const SOCIAL_IMAGE_SIZE = {
  width: 1200,
  height: 630,
} as const;

const SOCIAL_IMAGE_THEME = {
  background: 'linear-gradient(160deg, #0e0e10 0%, #1a1400 100%)',
  glowPrimary: 'rgba(255, 170, 0, 0.25)',
  glowSecondary: 'rgba(85, 255, 85, 0.2)',
};

export function createSocialImage(locale: AppLocale) {
  const previewCopy = SITE_SOCIAL_PREVIEW_COPY[locale];

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
        overflow: 'hidden',
        background: SOCIAL_IMAGE_THEME.background,
        color: '#f8fafc',
        fontFamily: 'Segoe UI, PingFang SC, Microsoft YaHei, sans-serif',
        padding: 52,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: -120,
          top: -100,
          width: 420,
          height: 420,
          borderRadius: 420,
          background: SOCIAL_IMAGE_THEME.glowPrimary,
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: -80,
          bottom: -110,
          width: 390,
          height: 390,
          borderRadius: 390,
          background: SOCIAL_IMAGE_THEME.glowSecondary,
        }}
      />
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '46px 52px',
          borderRadius: 30,
          border: '1px solid rgba(255, 255, 255, 0.14)',
          background:
            'linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.06) 100%)',
          boxShadow: '0 26px 80px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.18)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              borderRadius: 999,
              border: '1px solid rgba(255, 255, 255, 0.18)',
              background: 'rgba(255, 255, 255, 0.08)',
              padding: '10px 18px',
              fontSize: 26,
              fontWeight: 600,
            }}
          >
            <div
              style={{
                width: 11,
                height: 11,
                borderRadius: 11,
                background: '#FFAA00',
              }}
            />
            <span>{previewCopy.brand}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 10,
                background: '#FFAA00',
              }}
            />
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 10,
                background: '#55FF55',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 980 }}>
          <div
            style={{
              display: 'flex',
              fontSize: 64,
              fontWeight: 800,
              lineHeight: 1.14,
              letterSpacing: '-0.02em',
              color: '#ffffff',
            }}
          >
            {previewCopy.headline}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 31,
              lineHeight: 1.42,
              color: 'rgba(255, 255, 255, 0.82)',
            }}
          >
            {previewCopy.summary}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 24,
            color: 'rgba(255, 255, 255, 0.75)',
          }}
        >
          <span style={{ display: 'flex' }}>mik.noctiro.moe</span>
          <span style={{ display: 'flex', color: '#FFAA00', fontWeight: 700 }}>Mik Casual</span>
        </div>
      </div>
    </div>,
    { ...SOCIAL_IMAGE_SIZE },
  );
}
