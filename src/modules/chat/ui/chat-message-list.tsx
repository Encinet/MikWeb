'use client';

import { Gamepad2, Globe, Hash, MessageCircle, Server, Shield } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import {
  Fragment,
  memo,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ChatDestination } from '@/modules/chat/model/chat-destination';
import type {
  ChatMessage,
  ChatPlayerMessage,
  ChatServerMessage,
} from '@/modules/chat/model/chat-protocol';
import { isPassiveMessage } from '@/modules/chat/model/chat-protocol';
import type { ChatReadCursor, ChatUnread } from '@/modules/chat/model/chat-reading';
import { messageCursor } from '@/modules/chat/model/chat-reading';
import type { PendingChatMessage } from '@/modules/chat/model/use-web-chat';
import { ChatActivityGroup } from '@/modules/chat/ui/chat-activity-group';
import { ChatContextMenu } from '@/modules/chat/ui/chat-context-menu';
import type { ChatMessageActionHandlers } from '@/modules/chat/ui/chat-message-actions';
import { ChatMessageActions } from '@/modules/chat/ui/chat-message-actions';
import { ChatMessageContent } from '@/modules/chat/ui/chat-message-content';
import { ChatScrollActions } from '@/modules/chat/ui/chat-scroll-actions';
import { useChatMessageContent } from '@/modules/chat/ui/use-chat-message-content';
import { useChatReadTracker } from '@/modules/chat/ui/use-chat-read-tracker';
import type { useChatScroll } from '@/modules/chat/ui/use-chat-scroll';
import MinecraftAvatar from '@/modules/player/ui/minecraft-avatar';
import { hasTranslationKey } from '@/shared/i18n/has-translation-key';

const PAGE_SIZE = 100;
export interface ChatMessageJump {
  conversation: string;
  messageId: string | null;
  sequence: number;
}
interface Props extends ChatMessageActionHandlers {
  conversation: string;
  destination: ChatDestination;
  title: string;
  owner: string;
  name: string;
  messages: ChatMessage[];
  pending: PendingChatMessage[];
  unread?: ChatUnread;
  jump: ChatMessageJump | null;
  paused: boolean;
  scroll: ReturnType<typeof useChatScroll>;
  onRead: (conversation: string, cursor: ChatReadCursor) => void;
  onRestore: (message: PendingChatMessage) => void;
  onJumpComplete: (sequence: number) => void;
  showActivity: boolean;
}
function dayKey(timestamp: number) {
  const date = new Date(timestamp);
  return [date.getFullYear(), date.getMonth(), date.getDate()].join('-');
}
function groupMessages(messages: ChatMessage[], boundary?: string) {
  const groups: ChatMessage[][] = [];
  for (const message of messages) {
    const last = groups.at(-1)?.at(-1);
    if (
      last &&
      message.id !== boundary &&
      ((last.kind === 'player' &&
        message.kind === 'player' &&
        last.senderUuid === message.senderUuid &&
        last.source === message.source &&
        message.createdAt - last.createdAt < 180_000) ||
        (isPassiveMessage(last) &&
          isPassiveMessage(message) &&
          message.createdAt - last.createdAt < 300_000)) &&
      dayKey(last.createdAt) === dayKey(message.createdAt)
    )
      groups.at(-1)?.push(message);
    else groups.push([message]);
  }
  return groups;
}

export const ChatMessageList = memo(function ChatMessageList({
  conversation,
  destination,
  title,
  owner,
  name,
  messages,
  pending,
  unread,
  jump,
  paused,
  scroll,
  onRead,
  onRestore,
  onJumpComplete,
  showActivity,
  onMention,
  onPrivate,
}: Props) {
  const t = useTranslations('chat');
  const locale = useLocale();
  const [boundary, setBoundary] = useState(unread?.firstId);
  const [revealedActivityId, setRevealedActivityId] = useState(jump?.messageId ?? null);
  const timeline = useMemo(
    () =>
      messages.filter(
        (message) =>
          showActivity ||
          !isPassiveMessage(message) ||
          message.id === revealedActivityId ||
          message.id === jump?.messageId,
      ),
    [messages, showActivity, revealedActivityId, jump?.messageId],
  );
  const [startId, setStartId] = useState(() => {
    const previous = scroll.initialView();
    const target =
      jump?.conversation === conversation ? jump.messageId : !previous ? unread?.firstId : null;
    const index = target ? timeline.findIndex((message) => message.id === target) : -1;
    return (
      timeline[
        Math.max(
          0,
          Math.min(
            timeline.length - (previous?.count || PAGE_SIZE),
            index < 0 ? timeline.length : index - 5,
          ),
        )
      ]?.id ?? null
    );
  });
  const start = Math.max(
    0,
    timeline.findIndex((message) => message.id === startId),
  );
  const [highlight, setHighlight] = useState<string | null>(null);
  const groups = useMemo(
    () => groupMessages(timeline.slice(start), boundary),
    [timeline, start, boundary],
  );
  const initial = useRef(true);
  const prepend = useRef<{ top: number; height: number; start: number } | null>(null);
  const track = useChatReadTracker(scroll.log, (cursor) => onRead(conversation, cursor), paused);
  const format = useMemo(
    () => ({
      time: new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }),
      date: new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }),
      full: new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }),
    }),
    [locale],
  );
  const reveal = useCallback(
    (id: string) => {
      const index = timeline.findIndex((message) => message.id === id);
      if (index >= 0 && index < start) setStartId(timeline[Math.max(0, index - 5)]?.id ?? null);
    },
    [timeline, start],
  );

  useLayoutEffect(() => {
    const root = scroll.log.current;
    if (root && prepend.current && prepend.current.start !== start) {
      root.scrollTop = prepend.current.top + root.scrollHeight - prepend.current.height;
      prepend.current = null;
    }
    if (initial.current && jump?.conversation !== conversation) {
      initial.current = false;
      if (!scroll.initialView() && boundary) scroll.toMessage(boundary);
    }
  }, [conversation, jump, start, scroll, boundary]);

  // Run after modal cleanup so the destination is no longer inert and can receive focus.
  useEffect(() => {
    if (jump?.conversation === conversation) {
      if (jump.messageId) {
        const index = timeline.findIndex((message) => message.id === jump.messageId);
        if (index >= 0 && index < start) {
          reveal(jump.messageId);
          return;
        }
        setHighlight(jump.messageId);
        setRevealedActivityId(jump.messageId);
        const id = jump.messageId;
        requestAnimationFrame(() => scroll.toMessage(id, true));
      } else scroll.toLatest();
      initial.current = false;
      onJumpComplete(jump.sequence);
    }
  }, [conversation, jump, timeline, start, reveal, scroll, onJumpComplete]);

  useEffect(() => {
    if (!boundary && unread && !scroll.atBottom) setBoundary(unread.firstId);
  }, [boundary, unread, scroll.atBottom]);
  useEffect(() => {
    if (!highlight) return;
    const timer = setTimeout(() => setHighlight(null), 2400);
    return () => clearTimeout(timer);
  }, [highlight]);
  const [localJump, setLocalJump] = useState<string | null>(null);
  const jumpToUnread = () => {
    if (!unread) return;
    reveal(unread.firstId);
    // Revealing earlier records needs one render before their element exists.
    setLocalJump(unread.firstId);
  };
  useLayoutEffect(() => {
    if (!localJump || timeline.findIndex((message) => message.id === localJump) < start) return;
    scroll.toMessage(localJump, true);
    setLocalJump(null);
  }, [localJump, timeline, start, scroll]);
  const RoomIcon =
    destination.channel === 'public'
      ? Hash
      : destination.channel === 'staff'
        ? Shield
        : MessageCircle;
  const errorText = (code: string) => {
    const key = `errors.${code}`;
    return hasTranslationKey(t, key) ? t(key) : t('errors.default');
  };

  return (
    <div className="chat-stream">
      <div
        ref={scroll.attach}
        className="chat-log"
        role="log"
        tabIndex={-1}
        aria-label={title}
        aria-live="polite"
        aria-relevant="additions text"
        onScroll={scroll.onScroll}
      >
        <div className="chat-log__content">
          {start > 0 ? (
            <button
              type="button"
              className="chat-history-more"
              onClick={() => {
                const root = scroll.log.current;
                if (root)
                  prepend.current = { top: root.scrollTop, height: root.scrollHeight, start };
                setStartId(timeline[Math.max(0, start - PAGE_SIZE)]?.id ?? null);
              }}
            >
              {t('loadEarlier')}
            </button>
          ) : null}
          {!timeline.length && !pending.length ? (
            <div className="chat-empty">
              <span className="chat-empty__mark" aria-hidden="true">
                <RoomIcon size={32} strokeWidth={1.25} />
              </span>
              <p>{t('emptyHistory')}</p>
            </div>
          ) : null}
          {groups.map((group, index) => {
            const first = group[0];
            if (!first) return null;
            const previous = groups[index - 1]?.[0];
            const showDate = !previous || dayKey(previous.createdAt) !== dayKey(first.createdAt);
            const SourceIcon =
              first.kind === 'player' && first.source === 'game' ? Gamepad2 : Globe;
            return (
              <Fragment key={first.id}>
                {showDate ? (
                  <div className="chat-date">
                    <span>
                      {dayKey(first.createdAt) === dayKey(Date.now())
                        ? t('today')
                        : format.date.format(first.createdAt)}
                    </span>
                  </div>
                ) : null}
                {first.id === boundary ? (
                  <div className="chat-unread-divider">
                    <span>{t('readMarker')}</span>
                  </div>
                ) : null}
                {first.kind === 'server' && isPassiveMessage(first) ? (
                  <ChatActivityGroup
                    messages={group.filter((message) => message.kind === 'server')}
                    highlighted={highlight}
                    revealedId={revealedActivityId}
                    formatTime={(timestamp) => format.time.format(timestamp)}
                  />
                ) : first.kind === 'server' ? (
                  <ServerMessageLine
                    message={first}
                    title={format.full.format(first.createdAt)}
                    time={format.time.format(first.createdAt)}
                    highlight={highlight === first.id}
                    track={track}
                  />
                ) : (
                  <article className={`chat-message${first.senderUuid === owner ? ' is-own' : ''}`}>
                    <div className="chat-message__avatar" aria-hidden="true">
                      <MinecraftAvatar uuid={first.senderUuid} name={first.senderName} size={40} />
                    </div>
                    <div className="chat-message__content">
                      <div className="chat-message__meta">
                        <strong>{first.senderName}</strong>
                        <span className="chat-message__source" title={t(`source.${first.source}`)}>
                          <SourceIcon size={13} aria-hidden="true" />
                          <span className="sr-only">{t(`source.${first.source}`)}</span>
                        </span>
                        <time
                          dateTime={new Date(first.createdAt).toISOString()}
                          title={format.full.format(first.createdAt)}
                        >
                          {format.time.format(first.createdAt)}
                        </time>
                      </div>
                      {group
                        .filter((message) => message.kind === 'player')
                        .map((message) => (
                          <MessageLine
                            key={message.id}
                            message={message}
                            title={format.full.format(message.createdAt)}
                            highlight={highlight === message.id}
                            track={track}
                            owner={owner}
                            onMention={onMention}
                            onPrivate={onPrivate}
                          />
                        ))}
                    </div>
                  </article>
                )}
              </Fragment>
            );
          })}
          {pending.map((message) => (
            <article className="chat-message chat-message--pending" key={message.requestId}>
              <div className="chat-message__avatar" aria-hidden="true">
                <MinecraftAvatar uuid={owner} name={name} size={40} />
              </div>
              <div className="chat-message__content">
                <div className="chat-message__meta">
                  <strong>{name}</strong>
                  <span>{t(`delivery.${message.status}`)}</span>
                </div>
                <p>{message.text}</p>
                {message.error ? (
                  <p className="chat-message__error">{errorText(message.error)}</p>
                ) : null}
                {message.status !== 'sending' ? (
                  <button
                    type="button"
                    className="chat-text-button"
                    onClick={() => onRestore(message)}
                  >
                    {t('restoreDraft')}
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>
      {!scroll.atBottom ? (
        <ChatScrollActions
          unreadCount={unread?.count ?? 0}
          onUnread={jumpToUnread}
          onLatest={() => {
            scroll.toLatest();
            scroll.log.current?.focus({ preventScroll: true });
          }}
        />
      ) : null}
    </div>
  );
});

const MessageLine = memo(function MessageLine({
  message,
  title,
  highlight,
  track,
  owner,
  onMention,
  onPrivate,
}: ChatMessageActionHandlers & {
  message: ChatPlayerMessage;
  title: string;
  highlight: boolean;
  track: ReturnType<typeof useChatReadTracker>;
  owner: string;
}) {
  const t = useTranslations('chat');
  const contentId = useId();
  const attach = useCallback(
    (element: HTMLSpanElement | null) => track(element, messageCursor(message)),
    [track, message],
  );
  return (
    <ChatContextMenu
      label={t('messageActions.label', { name: message.senderName })}
      actions={(close) => (
        <ChatMessageActions
          message={message}
          owner={owner}
          onMention={onMention}
          onPrivate={onPrivate}
          onCopied={close}
        />
      )}
    >
      {(target, keyboard) => (
        <div
          {...target}
          className={`chat-message__line chat-message-entry${highlight ? ' is-highlighted' : ''}${message.mentioned && message.senderUuid !== owner ? ' is-mentioned' : ''}`}
          data-chat-message={message.id}
          tabIndex={-1}
          title={title}
        >
          <button {...keyboard} className="chat-context-keyboard" aria-describedby={contentId} />
          <p className="chat-message__text" id={contentId}>
            <ChatMessageContent content={message.content} />
            <span ref={attach} className="chat-read-sentinel" aria-hidden="true" />
          </p>
        </div>
      )}
    </ChatContextMenu>
  );
});

const ServerMessageLine = memo(function ServerMessageLine({
  message,
  title,
  time,
  highlight,
  track,
}: {
  message: ChatServerMessage;
  title: string;
  time: string;
  highlight: boolean;
  track: ReturnType<typeof useChatReadTracker>;
}) {
  const t = useTranslations('chat.server');
  const content = useChatMessageContent();
  const attach = useCallback(
    (element: HTMLSpanElement | null) => track(element, messageCursor(message)),
    [track, message],
  );
  return (
    <article
      className={`chat-server-message chat-message__line${highlight ? ' is-highlighted' : ''}`}
      data-chat-message={message.id}
      tabIndex={-1}
      title={title}
      aria-label={t('label')}
    >
      <span className="chat-server-message__avatar" aria-hidden="true">
        {message.subject ? (
          <MinecraftAvatar
            uuid={message.subject.playerUuid}
            name={message.subject.name}
            size={22}
          />
        ) : (
          <Server size={18} />
        )}
      </span>
      <p className="chat-server-message__content">
        <ChatMessageContent content={content(message)} />
        {message.countsAsUnread ? (
          <span ref={attach} className="chat-read-sentinel" aria-hidden="true" />
        ) : null}
      </p>
      <time dateTime={new Date(message.createdAt).toISOString()}>{time}</time>
    </article>
  );
});
