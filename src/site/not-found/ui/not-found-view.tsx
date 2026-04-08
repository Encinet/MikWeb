import Link from 'next/link';
import type { CSSProperties } from 'react';

interface NotFoundViewProps {
  description: string;
  homeHref: string;
  homeLabel: string;
  title: string;
}

const notFoundCardStyle = {
  '--ui-card-blur': '20px',
  '--ui-card-saturation': '160%',
  '--ui-card-shadow-hover':
    '0 24px 64px var(--theme-shadow-glass), inset 0 1px 0 var(--theme-shadow-glass-inset)',
} as CSSProperties;

export default function NotFoundView({
  description,
  homeHref,
  homeLabel,
  title,
}: NotFoundViewProps) {
  return (
    <section className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-10 sm:px-6 sm:py-12">
      <div
        className="ui-card-surface relative z-10 w-full max-w-xl rounded-[32px] px-6 py-10 text-center sm:px-8 sm:py-12"
        style={notFoundCardStyle}
      >
        <div
          className="mb-6 text-[4.75rem] font-black leading-none sm:text-[6.5rem] lg:text-[7.5rem]"
          style={{
            color: 'var(--theme-text-heading)',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.045em',
            textShadow: '0 12px 40px rgba(0, 0, 0, 0.18)',
          }}
        >
          404
        </div>

        <h1
          className="mx-auto mb-4 max-w-lg text-3xl font-bold leading-tight sm:text-4xl"
          style={{ color: 'var(--theme-text-heading)' }}
        >
          {title}
        </h1>

        <p
          className="mx-auto max-w-2xl text-base leading-8 sm:text-lg"
          style={{ color: 'var(--theme-text-muted-soft)' }}
        >
          {description}
        </p>

        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href={homeHref}
            className="hero-join-btn mx-auto rounded-full sm:w-auto sm:max-w-none"
          >
            {homeLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
