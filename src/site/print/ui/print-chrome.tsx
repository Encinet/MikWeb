import Image from 'next/image';
import {
  ORGANIZATION_NAME,
  SITE_LOGO_PATH,
  SITE_NAME,
  SITE_URL,
} from '@/shared/config/site-config';
import type { AppLocale } from '@/shared/i18n/routing';

const PRINT_HEADER_COPY = {
  'zh-CN': {
    brand: 'Mik 米客服务器',
    headline: '创造休闲 Minecraft 服务器',
  },
  en: {
    brand: SITE_NAME,
    headline: 'Creative Casual Minecraft Server',
  },
} as const;

export function PrintHeader({ locale }: { locale: AppLocale }) {
  const brand = PRINT_HEADER_COPY[locale];

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
