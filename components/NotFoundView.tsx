import Link from 'next/link';

interface NotFoundViewProps {
  description: string;
  homeHref: string;
  homeLabel: string;
  title: string;
}

export default function NotFoundView({
  description,
  homeHref,
  homeLabel,
  title,
}: NotFoundViewProps) {
  return (
    <section className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-10 sm:px-6 sm:py-12">
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(circle at 18% 14%, rgba(255, 170, 0, 0.16), transparent 32%), radial-gradient(circle at 84% 10%, rgba(85, 255, 85, 0.12), transparent 24%), radial-gradient(circle at 50% 88%, rgba(124, 58, 237, 0.16), transparent 38%)',
        }}
      />

      <div
        className="relative z-10 w-full max-w-xl rounded-[32px] px-6 py-10 text-center sm:px-8 sm:py-12"
        style={{
          backdropFilter: 'blur(20px) saturate(160%)',
          WebkitBackdropFilter: 'blur(20px) saturate(160%)',
          background: 'var(--theme-surface-glass)',
          border: '1px solid var(--theme-border-glass)',
          boxShadow:
            '0 24px 64px var(--theme-shadow-glass), inset 0 1px 0 var(--theme-shadow-glass-inset)',
        }}
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
            className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition-transform hover:scale-[1.02]"
            style={{
              background: 'var(--brand-gold)',
              color: 'var(--theme-text-button)',
              boxShadow: '0 12px 28px rgba(255, 170, 0, 0.22)',
            }}
          >
            {homeLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
