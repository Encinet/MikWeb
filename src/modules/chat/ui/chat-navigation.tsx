'use client';

import { Hash, MessageCirclePlus, Pin, PinOff, Shield, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { ChatDestination } from '@/modules/chat/model/chat-destination';
import { destinationKey } from '@/modules/chat/model/chat-destination';

import type { ChatUnread } from '@/modules/chat/model/chat-reading';
import type { ChatThread, ChatWorkspaceState } from '@/modules/chat/model/chat-workspace';
import { ChatContextMenu } from '@/modules/chat/ui/chat-context-menu';
import MinecraftAvatar from '@/modules/player/ui/minecraft-avatar';

export function ChatNavigation({
  selected,
  staff,
  threads,
  unread,
  onChoose,
  onNewPrivate,
  privatePanelId,
  privatePanelOpen,
  drafts,
  online,
  onPin,
  onCloseThread,
}: {
  selected: ChatDestination;
  staff: boolean;
  threads: ChatThread[];
  unread: Map<string, ChatUnread>;
  onChoose: (destination: ChatDestination) => void;
  onNewPrivate: (trigger: HTMLButtonElement) => void;
  privatePanelId: string;
  privatePanelOpen: boolean;
  drafts: ChatWorkspaceState['drafts'];
  online: boolean;
  onPin: (thread: ChatThread) => void;
  onCloseThread: (thread: ChatThread) => void;
}) {
  const t = useTranslations('chat');
  const locale = useLocale();
  const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' });
  const date = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' });
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
                {drafts[channel]?.text ? (
                  <span className="chat-draft-indicator">{t('drafts.label')}</span>
                ) : null}
                {badge(channel)}
              </button>
            );
          })}
      </nav>
      <nav aria-label={t('privateList')} className="chat-threads">
        <button
          type="button"
          className="ui-sidebar-link"
          aria-expanded={privatePanelOpen}
          aria-controls={privatePanelId}
          onClick={(event) => onNewPrivate(event.currentTarget)}
        >
          <MessageCirclePlus size={18} aria-hidden="true" />
          {t('newPrivate')}
        </button>
        {threads.map((thread) => {
          const destination = thread.destination;
          const conversation = destinationKey(destination);
          const latest = thread.latest;
          const preview = thread.draft || latest?.content.map((part) => part.text).join('') || '';
          const sameDay =
            latest && new Date(latest.createdAt).toDateString() === new Date().toDateString();
          return (
            <ChatContextMenu
              key={destination.targetUuid}
              label={t('threads.actions', { name: destination.name })}
              actions={() => (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    tabIndex={-1}
                    className="chat-popover-action"
                    data-chat-menu-close
                    onClick={() => onPin(thread)}
                  >
                    {thread.pinned ? (
                      <PinOff size={16} aria-hidden="true" />
                    ) : (
                      <Pin size={16} aria-hidden="true" />
                    )}
                    {t(thread.pinned ? 'threads.unpin' : 'threads.pin')}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    tabIndex={-1}
                    className="chat-popover-action"
                    data-chat-menu-close
                    onClick={() => onCloseThread(thread)}
                  >
                    <X size={16} aria-hidden="true" />
                    {t('threads.close')}
                  </button>
                </>
              )}
            >
              {(target) => (
                <button
                  {...target}
                  type="button"
                  className="ui-sidebar-link chat-thread-link"
                  aria-current={key === conversation ? 'page' : undefined}
                  onClick={() => onChoose(destination)}
                >
                  <span className="chat-thread-avatar" aria-hidden="true">
                    <MinecraftAvatar
                      uuid={destination.targetUuid}
                      name={destination.name}
                      size={32}
                    />
                    {online && thread.peer ? <span className="chat-thread-online" /> : null}
                  </span>
                  <span className="chat-thread-copy">
                    <span className="chat-thread-heading">
                      <span>{destination.name}</span>
                      {thread.pinned ? <Pin size={11} aria-label={t('threads.pinned')} /> : null}
                      {latest ? (
                        <time dateTime={new Date(latest.createdAt).toISOString()}>
                          {(sameDay ? time : date).format(latest.createdAt)}
                        </time>
                      ) : null}
                    </span>
                    {preview ? (
                      <span className="chat-thread-preview">
                        {thread.draft ? (
                          <span className="chat-draft-indicator">{t('drafts.label')} </span>
                        ) : null}
                        {preview}
                      </span>
                    ) : null}
                    <span className="sr-only">
                      {online
                        ? t(thread.peer ? 'threads.online' : 'threads.offline')
                        : t('status.reconnecting')}
                    </span>
                  </span>
                  {badge(conversation)}
                </button>
              )}
            </ChatContextMenu>
          );
        })}
      </nav>
    </div>
  );
}
