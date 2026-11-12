'use client';

import { Activity, AlignJustify, Bell, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { useId } from 'react';
import type { ChatPreferences } from '@/modules/chat/model/chat-workspace';
import type { useChatNotifications } from '@/modules/chat/model/use-chat-notifications';
import type { ChatHistoryControls } from '@/modules/chat/ui/chat-history-settings';
import { ChatHistorySettings } from '@/modules/chat/ui/chat-history-settings';
import { Switch } from '@/shared/ui/switch';

export function ChatSettings({
  chat,
  notifications,
  appearance,
  preferences,
  onPreferenceChange,
}: {
  chat: ChatHistoryControls;
  notifications: Pick<ReturnType<typeof useChatNotifications>, 'status' | 'busy' | 'toggle'>;
  appearance: ReactNode;
  preferences: ChatPreferences;
  onPreferenceChange: (preferences: Partial<ChatPreferences>) => void;
}) {
  const t = useTranslations('chat');
  const notificationHelp = useId();
  const notificationUnavailable =
    notifications.status === 'unsupported' || notifications.status === 'denied';
  const notificationError =
    notifications.status === 'unsupported' ||
    notifications.status === 'denied' ||
    notifications.status === 'error'
      ? notifications.status
      : null;
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
      </div>
      <ChatHistorySettings chat={chat} />
    </div>
  );
}
