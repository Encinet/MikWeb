'use client';

import { Activity, AlignJustify, Bell, HardDrive, Trash2, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { useId, useState } from 'react';
import type { ChatPreferences } from '@/modules/chat/model/chat-workspace';
import type { useChatNotifications } from '@/modules/chat/model/use-chat-notifications';
import type { useWebChat } from '@/modules/chat/model/use-web-chat';
import { Switch } from '@/shared/ui/switch';

export function ChatSettings({
  chat,
  notifications,
  appearance,
  preferences,
  onPreferenceChange,
}: {
  chat: Pick<
    ReturnType<typeof useWebChat>,
    'persist' | 'clearHistory' | 'setPersistence' | 'storageFailed'
  >;
  notifications: Pick<ReturnType<typeof useChatNotifications>, 'status' | 'busy' | 'toggle'>;
  appearance: ReactNode;
  preferences: ChatPreferences;
  onPreferenceChange: (preferences: Partial<ChatPreferences>) => void;
}) {
  const t = useTranslations('chat');
  const common = useTranslations('common');
  const notificationHelp = useId();
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState<'clear' | 'disable' | null>(null);
  const notificationUnavailable =
    notifications.status === 'unsupported' || notifications.status === 'denied';
  const notificationError =
    notifications.status === 'unsupported' ||
    notifications.status === 'denied' ||
    notifications.status === 'error'
      ? notifications.status
      : null;
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
      {appearance}
      <div className="ui-settings-list">
        <div className="ui-setting-row chat-density-setting">
          <div className="ui-setting-row__label">
            <span>
              <AlignJustify size={18} aria-hidden="true" />
            </span>
            <strong>{t('preferences.density')}</strong>
          </div>
          <fieldset className="chat-density-control">
            <legend className="sr-only">{t('preferences.density')}</legend>
            {(['comfortable', 'compact'] as const).map((density) => (
              <button
                key={density}
                type="button"
                aria-pressed={preferences.density === density}
                onClick={() => onPreferenceChange({ density })}
              >
                {t(`preferences.${density}`)}
              </button>
            ))}
          </fieldset>
        </div>
        <div className="ui-setting-row">
          <div className="ui-setting-row__label">
            <span>
              <Users size={18} aria-hidden="true" />
            </span>
            <strong>{t('preferences.members')}</strong>
          </div>
          <Switch
            label={t('preferences.members')}
            checked={preferences.membersVisible}
            onChange={(membersVisible) => onPreferenceChange({ membersVisible })}
          />
        </div>
        <div className="ui-setting-row">
          <div className="ui-setting-row__label">
            <span>
              <Activity size={18} aria-hidden="true" />
            </span>
            <strong>{t('preferences.activity')}</strong>
          </div>
          <Switch
            label={t('preferences.activity')}
            checked={preferences.showActivity}
            onChange={(showActivity) => onPreferenceChange({ showActivity })}
          />
        </div>
        <div className="ui-setting-row">
          <div className="ui-setting-row__label">
            <span>
              <Bell size={18} aria-hidden="true" />
            </span>
            <div>
              <strong>{t('notifications.label')}</strong>
              {notificationError ? (
                <small id={notificationHelp} role="status">
                  {t(`notifications.${notificationError}`)}
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
            <div>
              <strong>{t('saveLocally')}</strong>
              <small>{t('drafts.persistenceHint')}</small>
            </div>
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
