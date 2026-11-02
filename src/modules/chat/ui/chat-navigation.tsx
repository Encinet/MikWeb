'use client';

import { Hash, MessageCirclePlus, Shield } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ChatDestination } from '@/modules/chat/model/chat-protocol';
import { destinationKey } from '@/modules/chat/model/chat-protocol';
import type { ChatUnread } from '@/modules/chat/model/chat-reading';
import MinecraftAvatar from '@/modules/player/ui/minecraft-avatar';

export function ChatNavigation({
  selected,
  staff,
  threads,
  unread,
  onChoose,
  onNewPrivate,
}: {
  selected: ChatDestination;
  staff: boolean;
  threads: { id: string; name: string }[];
  unread: Map<string, ChatUnread>;
  onChoose: (destination: ChatDestination) => void;
  onNewPrivate: () => void;
}) {
  const t = useTranslations('chat');
  const key = destinationKey(selected);
  const badge = (conversation: string) => {
    const count = unread.get(conversation)?.count;
    return count ? (
      <span className="chat-unread-count">
        <span aria-hidden="true">{count > 99 ? '99+' : count}</span>
        <span className="sr-only">{t('unreadCount', { count })}</span>
      </span>
    ) : null;
  };
  return (
    <div className="chat-navigation">
      <nav aria-label={t('title')} className="chat-channels">
        {(['public', 'staff'] as const)
          .filter((channel) => channel !== 'staff' || staff || selected.channel === 'staff')
          .map((channel) => {
            const Icon = channel === 'public' ? Hash : Shield;
            return (
              <button
                key={channel}
                type="button"
                className="ui-sidebar-link"
                aria-current={key === channel ? 'page' : undefined}
                disabled={channel === 'staff' && !staff}
                onClick={() => onChoose({ channel })}
              >
                <Icon size={18} aria-hidden="true" />
                <span className="chat-navigation-label">{t(`channels.${channel}`)}</span>
                {badge(channel)}
              </button>
            );
          })}
      </nav>
      <nav aria-label={t('privateList')} className="chat-threads">
        <button type="button" className="ui-sidebar-link" onClick={onNewPrivate}>
          <MessageCirclePlus size={18} aria-hidden="true" />
          {t('newPrivate')}
        </button>
        {threads.map((thread) => (
          <button
            type="button"
            key={thread.id}
            className="ui-sidebar-link"
            aria-current={key === `private:${thread.id}` ? 'page' : undefined}
            onClick={() =>
              onChoose({ channel: 'private', targetUuid: thread.id, name: thread.name })
            }
          >
            <span className="chat-thread-avatar" aria-hidden="true">
              <MinecraftAvatar uuid={thread.id} name={thread.name} size={24} />
            </span>
            <span className="chat-navigation-label">{thread.name}</span>
            {badge(`private:${thread.id}`)}
          </button>
        ))}
      </nav>
    </div>
  );
}
