'use client';

import { Bell, HardDrive, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import type { useChatNotifications } from '@/modules/chat/model/use-chat-notifications';
import type { useWebChat } from '@/modules/chat/model/use-web-chat';
import { Switch } from '@/shared/ui/switch';

export function ChatSettings({
  chat,
  notifications,
}: {
  chat: Pick<
    ReturnType<typeof useWebChat>,
    'persist' | 'clearHistory' | 'setPersistence' | 'storageFailed'
  >;
  notifications: Pick<ReturnType<typeof useChatNotifications>, 'status' | 'busy' | 'toggle'>;
}) {
  const t = useTranslations('chat');
  const common = useTranslations('common');
  const notificationHelp = useId();
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState<'clear' | 'disable' | null>(null);
  const notificationUnavailable =
    notifications.status === 'unsupported' || notifications.status === 'denied';
  const notificationError = notificationUnavailable || notifications.status === 'error';
  const updateHistory = async (action: 'enable' | 'disable' | 'clear') => {
    setBusy(true);
    try {
      if (action === 'clear') await chat.clearHistory();
      else await chat.setPersistence(action === 'enable');
      setConfirmation(null);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="chat-settings">
      <div className="ui-settings-list">
        <div className="ui-setting-row">
          <div className="ui-setting-row__label">
            <span>
              <Bell size={18} aria-hidden="true" />
            </span>
            <div>
              <strong>{t('notifications.label')}</strong>
              {notificationError ? (
                <small id={notificationHelp} role="status">
                  {t(`notifications.${notifications.status}`)}
                </small>
              ) : null}
            </div>
          </div>
          <Switch
            label={t('notifications.label')}
            checked={notifications.status === 'on'}
            disabled={notifications.busy || notificationUnavailable}
            describedBy={notificationError ? notificationHelp : undefined}
            onChange={() => {
              void notifications.toggle();
            }}
          />
        </div>
        <div className="ui-setting-row">
          <div className="ui-setting-row__label">
            <span>
              <HardDrive size={18} aria-hidden="true" />
            </span>
            <strong>{t('saveLocally')}</strong>
          </div>
          <Switch
            label={t('saveLocally')}
            checked={chat.persist}
            disabled={busy}
            onChange={(persist) => {
              if (persist) void updateHistory('enable');
              else setConfirmation('disable');
            }}
          />
        </div>
        <div className="ui-setting-row">
          <div className="ui-setting-row__label">
            <span>
              <Trash2 size={18} aria-hidden="true" />
            </span>
            <strong>{t('clearHistory')}</strong>
          </div>
          <button
            type="button"
            className="ui-action-button ui-action-button--danger"
            disabled={busy}
            onClick={() => setConfirmation('clear')}
          >
            {t('clearAction')}
          </button>
        </div>
      </div>
      {confirmation ? (
        <fieldset className="chat-settings-confirm" aria-label={t('clearHistory')}>
          <p>{t(confirmation === 'disable' ? 'disableHistoryConfirm' : 'clearConfirm')}</p>
          <div>
            <button
              type="button"
              className="ui-action-button"
              disabled={busy}
              onClick={() => setConfirmation(null)}
            >
              {common('actions.cancel')}
            </button>
            <button
              type="button"
              className="ui-action-button ui-action-button--danger"
              disabled={busy}
              onClick={() => {
                void updateHistory(confirmation);
              }}
            >
              {t('confirmClear')}
            </button>
          </div>
        </fieldset>
      ) : null}
      {chat.storageFailed ? (
        <p className="ui-inline-message" role="alert">
          {t('storageFailed')}
        </p>
      ) : null}
    </div>
  );
}
