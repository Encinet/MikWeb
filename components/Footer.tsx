'use client';

import { useTranslations } from 'next-intl';

export default function Footer() {
  const t = useTranslations('footer');

  return (
    <footer style={{
      backdropFilter: 'blur(16px) saturate(150%)',
      background: 'var(--glass-bg)',
      borderTop: '1px solid var(--glass-border)',
      padding: 'clamp(1.5rem, 4vw, 2rem) 0',
      marginTop: 'clamp(3rem, 6vw, 5rem)'
    }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
        <p style={{
          color: 'var(--text-muted)',
          fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)',
          marginBottom: '8px'
        }}>
          {t('text')}
        </p>
        <p style={{
          color: 'var(--text-dimmed)',
          fontSize: '0.75rem'
        }}>
          {t('trademark')}
        </p>
      </div>
    </footer>
  );
}
