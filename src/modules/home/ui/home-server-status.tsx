'use client';

import { useTranslations } from 'next-intl';
import { usePlayerStatus } from '@/modules/player/model/use-player-status';
import { CopyButton } from '@/shared/ui/action/copy-button';

export function HomeServerStatus() {
  const t = useTranslations('home');
  const { isLoading, isOnline, networkError } = usePlayerStatus();
  const statusKey = isLoading
    ? 'loading'
    : networkError
      ? 'networkError'
      : isOnline
        ? 'online'
        : 'offline';

  return (
    <div className="home-server-status">
      <p className="home-server-status__presence" role="status">
        <span
          className={`home-server-dot${!isLoading && isOnline && !networkError ? ' is-online' : ''}`}
          aria-hidden="true"
        />
        <span>{t(`live.status.${statusKey}`)}</span>
      </p>
      <div className="home-server-status__address">
        <span className="sr-only">{t('hero.notice')}</span>
        <code>{t('hero.serverAddress')}</code>
        <CopyButton value={t('hero.serverAddress')} className="home-server-status__copy" />
      </div>
    </div>
  );
}
