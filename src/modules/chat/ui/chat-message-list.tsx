'use client';

import { Hash, MessageCircle, Server, Shield } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { PendingChatMessage } from '@/modules/chat/model/chat-delivery';
import type { ChatDestination } from '@/modules/chat/model/chat-destination';
import type { ChatMessage, ChatServerMessage } from '@/modules/chat/model/chat-protocol';
import { isPassiveMessage } from '@/modules/chat/model/chat-protocol';
import type { ChatReadCursor, ChatUnread } from '@/modules/chat/model/chat-reading';
import { messageCursor } from '@/modules/chat/model/chat-reading';
import {
  chatTimelineGroups,
  chatTimelineKey,
  chatDayKey as dayKey,
} from '@/modules/chat/model/chat-timeline';
import { ChatActivityGroup } from '@/modules/chat/ui/chat-activity-group';
import type { ChatMessageActionHandlers } from '@/modules/chat/ui/chat-message-actions';
import { ChatMessageContent } from '@/modules/chat/ui/chat-message-content';
import { finishChatRegrouping } from '@/modules/chat/ui/chat-regroup-motion';
import { ChatScrollActions } from '@/modules/chat/ui/chat-scroll-actions';
import { ChatUserMessageRow } from '@/modules/chat/ui/chat-user-message';
import { useChatMessageContent } from '@/modules/chat/ui/use-chat-message-content';
import { useChatReadTracker } from '@/modules/chat/ui/use-chat-read-tracker';
import type { useChatScroll } from '@/modules/chat/ui/use-chat-scroll';
import MinecraftAvatar from '@/modules/player/ui/minecraft-avatar';

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
  syncing?: boolean;
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
  syncing,
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
    () => chatTimelineGroups(timeline, pending, owner, name, start, boundary),
    [timeline, pending, owner, name, start, boundary],
  );
  const previousTimeline = useRef<ChatMessage[] | null>(null);
  const mergePulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mergedActivityId, setMergedActivityId] = useState<string | null>(null);
  useEffect(() => {
    const previous = previousTimeline.current;
    previousTimeline.current = timeline;
    if (!previous || previous.length >= timeline.length) return;
    const appended = previous.every((message, index) => timeline[index]?.id === message.id);
    const previousLast = previous.at(-1);
    const firstAdded = timeline[previous.length];
    if (
      !appended ||
      !previousLast ||
      !firstAdded ||
      !isPassiveMessage(previousLast) ||
      !isPassiveMessage(firstAdded) ||
      dayKey(previousLast.createdAt) !== dayKey(firstAdded.createdAt)
    )
      return;
    const targetGroup = groups.find((group) =>
      group.some((message) => message.id === previousLast.id),
    );
    if (!targetGroup?.some((message) => message.id === firstAdded.id)) return;
    const targetId = targetGroup?.[0]?.id;
    if (!targetId) return;
    if (mergePulseTimer.current) clearTimeout(mergePulseTimer.current);
    setMergedActivityId(targetId);
    mergePulseTimer.current = setTimeout(() => {
      setMergedActivityId(null);
      mergePulseTimer.current = null;
    }, 240);
  }, [timeline, groups]);
  useEffect(
    () => () => {
      if (mergePulseTimer.current) clearTimeout(mergePulseTimer.current);
    },
    [],
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
      finishChatRegrouping(root);
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
  return (
    <div className="chat-stream">
      <div
        ref={scroll.attach}
        className="chat-log"
        role="log"
        tabIndex={-1}
        aria-label={title}
        aria-live={syncing ? 'off' : 'polite'}
        aria-busy={syncing}
        aria-relevant="additions text"
        onScroll={scroll.onScroll}
        onPointerDownCapture={(event) => finishChatRegrouping(event.currentTarget)}
        onKeyDownCapture={(event) => finishChatRegrouping(event.currentTarget)}
        onContextMenuCapture={(event) => finishChatRegrouping(event.currentTarget)}
      >
        <div className="chat-log__content">
          {start > 0 ? (
            <button
              type="button"
              className="chat-history-more"
              onClick={() => {
                const root = scroll.log.current;
                if (root) {
                  finishChatRegrouping(root);
                  prepend.current = { top: root.scrollTop, height: root.scrollHeight, start };
                }
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
          {groups.flatMap((group, index) => {
            const first = group[0];
            if (!first) return [];
            const previous = groups[index - 1]?.[0];
            const showDate = !previous || dayKey(previous.createdAt) !== dayKey(first.createdAt);
            const groupKey = chatTimelineKey(first, owner);
            const items: ReactNode[] = [];
            if (showDate)
              items.push(
                <div className="chat-date" key={`date:${groupKey}`}>
                  <span>
                    {dayKey(first.createdAt) === dayKey(Date.now())
                      ? t('today')
                      : format.date.format(first.createdAt)}
                  </span>
                </div>,
              );
            if (first.id === boundary)
              items.push(
                <div className="chat-unread-divider" key={`unread:${groupKey}`}>
                  <span>{t('readMarker')}</span>
                </div>,
              );
            if (first.kind === 'server' && isPassiveMessage(first))
              items.push(
                <ChatActivityGroup
                  key={groupKey}
                  messages={group.filter((message) => message.kind === 'server')}
                  highlighted={highlight}
                  revealedId={revealedActivityId}
                  merged={mergedActivityId === first.id}
                  formatTime={(timestamp) => format.time.format(timestamp)}
                />,
              );
            else if (first.kind === 'server')
              items.push(
                <ServerMessageLine
                  key={groupKey}
                  message={first}
                  title={format.full.format(first.createdAt)}
                  time={format.time.format(first.createdAt)}
                  highlight={highlight === first.id}
                  track={track}
                />,
              );
            else
              group.forEach((message, messageIndex) => {
                if (message.kind === 'server') return;
                items.push(
                  <ChatUserMessageRow
                    key={chatTimelineKey(message, owner)}
                    message={message}
                    startsGroup={messageIndex === 0}
                    time={format.time.format(message.createdAt)}
                    title={format.full.format(message.createdAt)}
                    highlight={highlight === message.id}
                    track={track}
                    owner={owner}
                    onMention={onMention}
                    onPrivate={onPrivate}
                    onRestore={onRestore}
                  />,
                );
              });
            return items;
          })}
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
