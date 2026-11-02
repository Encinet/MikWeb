'use client';

import { Bell, LoaderCircle, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId } from 'react';
import type { useChatNotifications } from '@/modules/chat/model/use-chat-notifications';

export function ChatNotificationSuggestion({
  notifications,
}: {
  notifications: Pick<
    ReturnType<typeof useChatNotifications>,
    'suggestion' | 'status' | 'busy' | 'toggle' | 'dismissSuggestion'
  >;
}) {
  const t = useTranslations('chat.notifications');
  const errorId = useId();
  if (!notifications.suggestion) return null;
  const Icon = notifications.busy ? LoaderCircle : Bell;
  return (
    <div className="chat-notification-suggestion">
      <div>
        <button
          type="button"
          className="chat-notification-enable"
          onClick={() => void notifications.toggle()}
          disabled={notifications.busy}
          aria-describedby={notifications.status === 'error' ? errorId : undefined}
        >
          <Icon
            size={16}
            className={notifications.busy ? 'chat-spinner' : undefined}
            aria-hidden="true"
          />
          {t('enable')}
        </button>
        {notifications.status === 'error' ? (
          <p id={errorId} role="status">
            {t('error')}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        className="chat-icon-button"
        onClick={notifications.dismissSuggestion}
        disabled={notifications.busy}
        aria-label={t('dismiss')}
        title={t('dismiss')}
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
