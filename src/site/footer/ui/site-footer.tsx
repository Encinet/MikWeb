import Image from 'next/image';
import { getTranslations } from 'next-intl/server';

import { Link } from '@/shared/i18n/routing';
import {
  ORGANIZATION_LOGO_PATH,
  ORGANIZATION_NAME,
  ORGANIZATION_URL,
  SITE_LOGO_PATH,
  SOURCE_CODE_URL,
} from '@/site/config/site-config';

export default async function SiteFooter() {
  const t = await getTranslations();

  const navLinks = [
    { href: '/', label: t('nav.items.home') },
    { href: '/buildings', label: t('nav.items.buildings') },
    { href: '/wiki', label: t('nav.items.wiki') },
    { href: '/map', label: t('nav.items.map') },
    { href: '/bans', label: t('nav.items.bans') },
  ];

  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__col site-footer__col--brand">
          <Link href="/" className="site-footer__brand">
            <Image
              src={SITE_LOGO_PATH}
              alt="Mik"
              width={36}
              height={36}
              className="site-footer__logo"
            />
            <span>Mik</span>
          </Link>
          <p className="site-footer__desc">{t('metadata.description')}</p>
          <p className="site-footer__copyright">
            &copy; 2021-2026{' '}
            <a href={ORGANIZATION_URL} target="_blank" rel="noopener noreferrer">
              {ORGANIZATION_NAME}
            </a>
          </p>
        </div>

        <div className="site-footer__col">
          <strong className="site-footer__col-title">{t('footer.navigation')}</strong>
          <ul className="site-footer__links">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="site-footer__col">
          <strong className="site-footer__col-title">{t('footer.siteInfo')}</strong>
          <ul className="site-footer__links">
            <li>
              <a
                href={SOURCE_CODE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="site-footer__gh-link"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                </svg>
                <span>GitHub</span>
              </a>
            </li>
            <li>
              <a
                href={ORGANIZATION_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="site-footer__organization"
              >
                <Image
                  src={ORGANIZATION_LOGO_PATH}
                  alt={ORGANIZATION_NAME}
                  width={18}
                  height={18}
                />
                <span>{ORGANIZATION_NAME}</span>
              </a>
            </li>
          </ul>
          <p className="site-footer__legal">
            {t('footer.legal.minecraftTrademark', { organizationName: ORGANIZATION_NAME })}{' '}
            <a
              href="https://www.minecraft.net/en-us/eula"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('footer.legal.eula')}
            </a>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}
