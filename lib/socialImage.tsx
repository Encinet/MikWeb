import { ImageResponse } from 'next/og';

import type { AppLocale } from '@/i18n/routing';
import { SITE_SOCIAL_PREVIEW_COPY } from '@/lib/site';

export const SOCIAL_IMAGE_SIZE = {
  width: 1200,
  height: 630,
} as const;

const SOCIAL_IMAGE_BACKGROUND_BY_LOCALE: Record<AppLocale, string> = {
  'zh-CN':
    'radial-gradient(circle at 12% 15%, #2b4d7a 0%, transparent 45%), radial-gradient(circle at 88% 82%, #5c8f66 0%, transparent 44%), linear-gradient(135deg, #101820 0%, #1d2f3b 52%, #0f1419 100%)',
  en: 'radial-gradient(circle at 16% 18%, #325d86 0%, transparent 46%), radial-gradient(circle at 86% 80%, #4d7b58 0%, transparent 42%), linear-gradient(135deg, #101820 0%, #1d2f3b 52%, #0f1419 100%)',
};

export function createSocialImage(locale: AppLocale) {
  const previewCopy = SITE_SOCIAL_PREVIEW_COPY[locale];

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '64px 72px',
        background: SOCIAL_IMAGE_BACKGROUND_BY_LOCALE[locale],
        color: '#f1f5f9',
        fontFamily: 'Noto Sans, Segoe UI, Arial, sans-serif',
      }}
    >
      <div style={{ display: 'flex', fontSize: 38, opacity: 0.95, marginBottom: 28 }}>
        {previewCopy.brand}
      </div>
      <div
        style={{
          display: 'flex',
          fontSize: 66,
          fontWeight: 800,
          lineHeight: 1.15,
          marginBottom: 24,
          maxWidth: 980,
        }}
      >
        {previewCopy.headline}
      </div>
      <div
        style={{
          display: 'flex',
          fontSize: 34,
          color: '#cbd5e1',
          maxWidth: 980,
          lineHeight: 1.4,
        }}
      >
        {previewCopy.summary}
      </div>
    </div>,
    { ...SOCIAL_IMAGE_SIZE },
  );
}
