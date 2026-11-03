'use client';

import { RotateCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { useWebChat } from '@/modules/chat/model/use-web-chat';
import { hasTranslationKey } from '@/shared/i18n/has-translation-key';

export function ChatConnectionBanner({
  connection,
  onRetry,
}: {
  connection: ReturnType<typeof useWebChat>['connection'];
  onRetry: () => void;
}) {
  const t = useTranslations('chat');
  const common = useTranslations('common');
  const error = connection.error ? `errors.${connection.error}` : '';
  return (
    <div className="chat-connection-banner" data-state={connection.status}>
      <p role="status" aria-live="polite">
        {connection.status === 'error'
          ? hasTranslationKey(t, error)
            ? t(error)
            : t('errors.default')
          : t('connection.reconnecting')}
      </p>
      {connection.status === 'error' ? (
        <button className="chat-text-button" type="button" onClick={onRetry}>
          <RotateCw size={14} aria-hidden="true" />
          {common('actions.retry')}
        </button>
      ) : null}
    </div>
  );
}
