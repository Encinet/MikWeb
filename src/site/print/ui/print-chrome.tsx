import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import {
  ORGANIZATION_NAME,
  SITE_LOGO_PATH,
  SITE_NAME,
  SITE_URL,
} from '@/shared/config/site-config';
import type { AppLocale } from '@/shared/i18n/routing';

export async function PrintHeader({ locale }: { locale: AppLocale }) {
  const t = await getTranslations({ locale, namespace: 'nav.brand' });

  return (
    <header className="print-site-header">
      <Image src={SITE_LOGO_PATH} alt="" width={32} height={32} loading="eager" />
      <strong className="print-site-header__brand">{SITE_NAME}</strong>
      <span className="print-site-header__description">{t('subtitle')}</span>
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
