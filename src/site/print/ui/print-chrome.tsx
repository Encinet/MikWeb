import Image from 'next/image';

import type { AppLocale } from '@/shared/i18n/routing';
import {
  ORGANIZATION_NAME,
  SITE_LOGO_PATH,
  SITE_SOCIAL_PREVIEW_COPY,
  SITE_URL,
} from '@/site/config/site-config';

export function PrintHeader({ locale }: { locale: AppLocale }) {
  const brand = SITE_SOCIAL_PREVIEW_COPY[locale];

  return (
    <header className="print-site-header">
      <Image src={SITE_LOGO_PATH} alt="" width={32} height={32} loading="eager" />
      <strong className="print-site-header__brand">{brand.brand}</strong>
      <span className="print-site-header__description">{brand.headline}</span>
    </header>
  );
}

export function PrintFooter() {
  return (
    <footer className="print-site-footer">
      <a href={SITE_URL}>{SITE_URL}</a>
      <span>© {ORGANIZATION_NAME}</span>
    </footer>
  );
}
