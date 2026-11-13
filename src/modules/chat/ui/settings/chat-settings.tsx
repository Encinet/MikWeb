'use client';

import { Activity, AlignJustify, Bell, HardDrive, Palette, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { useId, useRef, useState } from 'react';
import type { useChatNotifications } from '@/modules/chat/model/use-chat-notifications';
import type { ChatPreferences } from '@/modules/chat/model/workspace/chat-workspace';
import type { ChatHistoryControls } from '@/modules/chat/ui/settings/chat-history-settings';
import { ChatHistorySettings } from '@/modules/chat/ui/settings/chat-history-settings';
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
  const [category, setCategory] = useState('display');
  const navigation = useRef<HTMLDivElement>(null);
  const id = useId();
  const categories = [
    { key: 'display', icon: Palette },
    { key: 'notifications', icon: Bell },
    { key: 'history', icon: HardDrive },
  ] as const;
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
      <div
        className="chat-settings-nav"
        role="tablist"
        aria-label={t('settingsSections.label')}
        ref={navigation}
        onKeyDown={(event) => {
          const tabs = [
            ...(navigation.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? []),
          ];
          const current = tabs.indexOf(document.activeElement as HTMLButtonElement);
          const offset = ['ArrowRight', 'ArrowDown'].includes(event.key)
            ? 1
            : ['ArrowLeft', 'ArrowUp'].includes(event.key)
              ? -1
              : 0;
          const next =
            event.key === 'Home'
              ? 0
              : event.key === 'End'
                ? tabs.length - 1
                : offset
                  ? (current + offset + tabs.length) % tabs.length
                  : -1;
          if (next < 0) return;
          event.preventDefault();
          tabs[next]?.focus();
          tabs[next]?.click();
        }}
      >
        {categories.map(({ key, icon: Icon }) => (
          <button
            key={key}
            id={`${id}-${key}-tab`}
            type="button"
            role="tab"
            aria-selected={category === key}
            aria-controls={`${id}-${key}`}
            tabIndex={category === key ? 0 : -1}
            onClick={() => setCategory(key)}
          >
            <Icon size={18} aria-hidden="true" />
            <span>{t(`settingsSections.${key}`)}</span>
          </button>
        ))}
      </div>
      <div className="chat-settings-content">
        <section
          role="tabpanel"
          id={`${id}-display`}
          aria-labelledby={`${id}-display-tab`}
          hidden={category !== 'display'}
        >
          <header className="chat-settings-heading">
            <h3>{t('settingsSections.display')}</h3>
          </header>
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
          </div>
        </section>
        <section
          role="tabpanel"
          id={`${id}-notifications`}
          aria-labelledby={`${id}-notifications-tab`}
          hidden={category !== 'notifications'}
        >
          <header className="chat-settings-heading">
            <h3>{t('settingsSections.notifications')}</h3>
          </header>
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
        </section>
        <section
          role="tabpanel"
          id={`${id}-history`}
          aria-labelledby={`${id}-history-tab`}
          hidden={category !== 'history'}
        >
          <ChatHistorySettings chat={chat} active={category === 'history'} />
        </section>
      </div>
    </div>
  );
}
