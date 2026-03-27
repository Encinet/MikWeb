import { getLocale, getTranslations } from 'next-intl/server';

import { ORGANIZATION_NAME, ORGANIZATION_URL, SOURCE_CODE_URL } from '@/lib/site';

export default async function Footer() {
  const currentYear = new Date().getFullYear();
  const locale = await getLocale();
  const t = await getTranslations({
    locale,
    namespace: 'footer',
  });

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        padding: '0 0 1rem 0',
        marginTop: 'clamp(3rem, 6vw, 5rem)',
      }}
    >
      <footer
        style={{
          width: '100%',
          maxWidth: 'min(95%, 1400px)',
          backdropFilter: 'blur(16px) saturate(150%)',
          'WebkitBackdropFilter': 'blur(16px) saturate(150%)',
          background: 'var(--glass-bg)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'clamp(12px, 2vw, 24px)',
          padding: 'clamp(1.5rem, 4vw, 2rem) 0',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <p
            style={{
              color: 'var(--text-muted)',
              fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)',
              marginBottom: '8px',
            }}
          >
            © 2021-{currentYear}{' '}
            <a
              href={ORGANIZATION_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="footer-link footer-link-muted"
              style={{
                textDecoration: 'none',
                transition: 'color 0.2s ease',
              }}
            >
              {ORGANIZATION_NAME}
            </a>
            . {t('licensedUnder')}{' '}
            <a
              href={SOURCE_CODE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="footer-link footer-link-muted"
              style={{
                textDecoration: 'underline',
                transition: 'color 0.2s ease',
              }}
            >
              {t('sourceCode')}
            </a>
            .
          </p>
          <p style={{ color: 'var(--text-dimmed)', fontSize: '0.75rem' }}>
            {t('minecraftTrademark', { organizationName: ORGANIZATION_NAME })}{' '}
            <a
              href="https://www.minecraft.net/en-us/eula"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-link footer-link-dimmed"
              style={{
                textDecoration: 'underline',
                transition: 'color 0.2s ease',
              }}
            >
              {t('eula')}
            </a>
            .
          </p>
        </div>
      </footer>
    </div>
  );
}
