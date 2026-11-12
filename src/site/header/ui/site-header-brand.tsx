import Image from 'next/image';
import { SITE_LOGO_PATH, SITE_NAME, SITE_SHORT_NAME } from '@/shared/config/site-config';
import { Link } from '@/shared/i18n/navigation';

export function SiteHeaderBrand({ subtitle }: { subtitle: string }) {
  return (
    <Link href="/" className="project-navbar-brand" aria-label={`${SITE_NAME} · ${subtitle}`}>
      <Image
        src={SITE_LOGO_PATH}
        alt=""
        width={36}
        height={36}
        className="project-navbar-brand__logo"
      />
      <span>{SITE_SHORT_NAME}</span>
    </Link>
  );
}
