'use client';

import Image from 'next/image';

import { Link } from '@/shared/i18n/routing';

export function SiteHeaderBrand({ subtitle }: { subtitle: string }) {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2 sm:gap-3">
      <Image
        src="/mik-standard-rounded.webp"
        alt="Mik Server Logo"
        width={48}
        height={48}
        className="h-8 w-8 sm:h-12 sm:w-12"
      />
      <div>
        <h1
          style={{
            fontSize: 'clamp(1.125rem, 2vw, 1.5rem)',
            fontWeight: 600,
            letterSpacing: '-0.02em',
          }}
        >
          <span style={{ color: '#FFAA00' }}>Mi</span>
          <span style={{ color: 'var(--theme-text-logo-k)' }}>k</span>
          <span
            style={{
              color: 'var(--theme-accent-brand-casual)',
              marginLeft: 'clamp(0.25rem, 1vw, 0.5rem)',
            }}
          >
            Casual
          </span>
        </h1>
        <p
          className="hidden text-xs sm:block"
          style={{
            color: 'var(--theme-text-muted)',
            marginTop: '-2px',
          }}
        >
          {subtitle}
        </p>
      </div>
    </Link>
  );
}
