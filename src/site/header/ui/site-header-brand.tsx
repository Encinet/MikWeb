import Image from 'next/image';

import { Link } from '@/shared/i18n/routing';
import { SITE_LOGO_PATH } from '@/site/config/site-config';

export function SiteHeaderBrand({ subtitle }: { subtitle: string }) {
  return (
    <Link href="/" className="project-navbar-brand" aria-label={subtitle}>
      <Image
        src={SITE_LOGO_PATH}
        alt="Mik Server Logo"
        width={36}
        height={36}
        className="project-navbar-brand__logo"
      />
      <span>Mik</span>
    </Link>
  );
}
