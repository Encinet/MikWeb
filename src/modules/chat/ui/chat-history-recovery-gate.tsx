'use client';

import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import type { ChatHistoryRecovery } from '@/modules/chat/model/chat-history-compatibility';
import { ChatGate } from '@/modules/chat/ui/chat-gate';
import { AppDialog } from '@/shared/ui/dialog/app-dialog';

export function ChatHistoryRecoveryGate({
  recovery,
  onDelete,
}: {
  recovery: ChatHistoryRecovery;
  onDelete: () => Promise<void>;
}) {
  const t = useTranslations('chat.historyRecovery');
  const common = useTranslations('common');
  const [open, setOpen] = useState(true);
  const descriptionId = useId();
  const busy = recovery === 'deleting' || recovery === 'blocked';
  return (
    <>
      <ChatGate state="error" message={t('required')}>
        <button type="button" className="chat-primary" onClick={() => setOpen(true)}>
          {t('review')}
        </button>
      </ChatGate>
      <AppDialog
        isOpen={open}
        onClose={() => setOpen(false)}
        dismissible={!busy}
        title={t('title')}
        icon={<Trash2 size={18} />}
        descriptionId={descriptionId}
        className="chat-dialog"
      >
        <div className="chat-settings-confirm">
          <p id={descriptionId}>{t('description')}</p>
          {recovery === 'failed' ? <p role="alert">{t('failed')}</p> : null}
          {busy ? <p role="status">{t(recovery === 'blocked' ? 'blocked' : 'deleting')}</p> : null}
          <div>
            <button
              type="button"
              className="ui-action-button"
              data-dialog-initial-focus
              disabled={busy}
              onClick={() => setOpen(false)}
            >
              {common('actions.cancel')}
            </button>
            <button
              type="button"
              className="ui-action-button ui-action-button--danger"
              disabled={busy}
              onClick={() => void onDelete()}
            >
              {t('delete')}
            </button>
          </div>
        </div>
      </AppDialog>
    </>
  );
}
