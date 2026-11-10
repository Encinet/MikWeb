'use client';

import { useTransition } from 'react';
import type { AppLocale } from '@/shared/i18n/routing';
import { getErrorContent } from '@/site/error/lib/error-content';
import styles from './error-view.module.css';

export function ErrorView({ locale, retry }: { locale: AppLocale; retry: () => void }) {
  const t = getErrorContent(locale);
  const [pending, startTransition] = useTransition();
  return (
    <section className={styles.page} aria-labelledby="page-error-title" aria-busy={pending}>
      <div className={styles.card}>
        <span className={styles.mark} aria-hidden="true">
          !
        </span>
        <h1 id="page-error-title">{t.title}</h1>
        <p>{t.description}</p>
        <div className={styles.actions}>
          <button type="button" disabled={pending} onClick={() => startTransition(retry)}>
            {pending ? t.retrying : t.retry}
          </button>
          <a href={`/${locale}`}>{t.home}</a>
        </div>
      </div>
    </section>
  );
}
