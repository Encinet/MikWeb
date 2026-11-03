'use client';

import { RotateCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import type { ChatConnection } from '@/modules/chat/model/chat-connection';
import { hasTranslationKey } from '@/shared/i18n/has-translation-key';

const CONNECTION_NOTICE_DELAY = 1500;

export function ChatConnectionBanner({
  connection,
  onRetry,
}: {
  connection: ChatConnection;
  onRetry: () => void;
}) {
  const t = useTranslations('chat');
  const common = useTranslations('common');
  const [visible, setVisible] = useState(false);
  // The workspace mounts this for one outage, across reconnect/authorization transitions.
  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), CONNECTION_NOTICE_DELAY);
    return () => window.clearTimeout(timer);
  }, []);
  const failed = connection.status === 'error';
  if (!failed && !visible) return null;
  const error = connection.error ? `errors.${connection.error}` : '';
  return (
    <div className="chat-connection-banner" data-state={connection.status}>
      <p role={failed ? 'alert' : 'status'}>
        {failed
          ? hasTranslationKey(t, error)
            ? t(error)
            : t('errors.default')
          : t('connection.reconnecting')}
      </p>
      {failed ? (
        <button className="chat-text-button" type="button" onClick={onRetry}>
          <RotateCw size={14} aria-hidden="true" />
          {common('actions.retry')}
        </button>
      ) : null}
    </div>
  );
}
