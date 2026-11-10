'use client';

import { Bell, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId } from 'react';
import type { useChatNotifications } from '@/modules/chat/model/use-chat-notifications';
import { ProgressRing } from '@/shared/ui/feedback/loading-state';

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
          {notifications.busy ? <ProgressRing size="sm" /> : <Bell size={16} aria-hidden="true" />}
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
