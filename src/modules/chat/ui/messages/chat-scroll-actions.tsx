'use client';

import { ArrowDown } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function ChatScrollActions({
  unreadCount,
  onUnread,
  onLatest,
}: {
  unreadCount: number;
  onUnread: () => void;
  onLatest: () => void;
}) {
  const t = useTranslations('chat');
  return (
    <fieldset className="chat-scroll-actions" aria-label={t('readingActions')}>
      {unreadCount > 0 ? (
        <button type="button" className="chat-scroll-action chat-scroll-unread" onClick={onUnread}>
          {t('jumpUnread', { count: unreadCount })}
        </button>
      ) : null}
      <button
        type="button"
        className="chat-scroll-action chat-scroll-latest"
        aria-label={t('latest')}
        title={t('latest')}
        onClick={onLatest}
      >
        <ArrowDown size={16} aria-hidden="true" />
        {unreadCount === 0 ? t('latest') : null}
      </button>
    </fieldset>
  );
}
