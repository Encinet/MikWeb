'use client';

import { Check, CircleAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { PendingChatMessage } from '@/modules/chat/model/chat-delivery';
import { hasTranslationKey } from '@/shared/i18n/has-translation-key';
import { ProgressRing } from '@/shared/ui/feedback/loading-state';

/** Delivery feedback belongs to the message line, beneath the shared author heading. */
export function ChatDeliveryFeedback({
  message,
  onRestore,
}: {
  message: PendingChatMessage;
  onRestore: (message: PendingChatMessage) => void;
}) {
  const t = useTranslations('chat');
  const problem = message.status === 'failed' || message.status === 'unknown';
  const errorKey = message.error ? `errors.${message.error}` : null;
  const label = t(`delivery.${message.status}`);
  return (
    <>
      <span className="chat-delivery-indicator" title={label} aria-hidden="true">
        {message.status === 'accepted' ? (
          <Check size={12} />
        ) : problem ? (
          <CircleAlert size={12} />
        ) : (
          <ProgressRing size="sm" />
        )}
      </span>
      {problem ? (
        <div className="chat-delivery-feedback">
          <p role="status">
            {label}
            {errorKey
              ? ` · ${t(hasTranslationKey(t, errorKey) ? errorKey : 'errors.default')}`
              : ''}
          </p>
          <button type="button" className="chat-text-button" onClick={() => onRestore(message)}>
            {t('restoreDraft')}
          </button>
        </div>
      ) : (
        <span className="sr-only" role="status">
          {label}
        </span>
      )}
    </>
  );
}
