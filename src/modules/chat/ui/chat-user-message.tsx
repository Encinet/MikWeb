'use client';

import { Gamepad2, Globe } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { memo, useCallback, useId } from 'react';
import type { PendingChatMessage } from '@/modules/chat/model/chat-delivery';
import type { ChatUserMessage } from '@/modules/chat/model/chat-protocol';
import { messageCursor } from '@/modules/chat/model/chat-reading';
import type { ChatPendingEntry } from '@/modules/chat/model/chat-timeline';
import { ChatAuthorAvatar } from '@/modules/chat/ui/chat-author-avatar';
import { ChatContextMenu } from '@/modules/chat/ui/chat-context-menu';
import { ChatDeliveryFeedback } from '@/modules/chat/ui/chat-delivery-feedback';
import type { ChatMessageActionHandlers } from '@/modules/chat/ui/chat-message-actions';
import { ChatMessageActions } from '@/modules/chat/ui/chat-message-actions';
import { ChatMessageContent } from '@/modules/chat/ui/chat-message-content';
import type { useChatReadTracker } from '@/modules/chat/ui/use-chat-read-tracker';

/** A message keeps its DOM identity when grouping changes around it. */
export const ChatUserMessageRow = memo(function ChatUserMessageRow({
  message,
  startsGroup,
  time,
  title,
  highlight,
  track,
  owner,
  onMention,
  onPrivate,
  onRestore,
}: ChatMessageActionHandlers & {
  message: ChatUserMessage | ChatPendingEntry;
  startsGroup: boolean;
  time: string;
  title: string;
  highlight: boolean;
  track: ReturnType<typeof useChatReadTracker>;
  owner: string;
  onRestore: (message: PendingChatMessage) => void;
}) {
  const t = useTranslations('chat');
  const contentId = useId();
  const attach = useCallback(
    (element: HTMLSpanElement | null) =>
      message.kind === 'user' ? track(element, messageCursor(message)) : undefined,
    [track, message],
  );
  const sourceLabel =
    message.source.kind === 'social'
      ? message.source.platformName
      : t(`source.${message.source.kind}`);
  const SourceIcon = message.source.kind === 'game' ? Gamepad2 : Globe;
  return (
    <article
      className={`chat-message${message.sender.playerUuid === owner ? ' is-own' : ''}${startsGroup ? '' : ' is-continuation'}`}
      aria-label={message.sender.name}
    >
      <div className="chat-message__avatar" aria-hidden="true">
        <ChatAuthorAvatar sender={message.sender} size={40} />
      </div>
      <div className="chat-message__content">
        <div
          className="chat-message__author"
          aria-hidden={!startsGroup || undefined}
          inert={!startsGroup}
        >
          <div className="chat-message__meta">
            <strong>{message.sender.name}</strong>
            <span className="chat-message__source" title={sourceLabel}>
              <SourceIcon size={13} aria-hidden="true" />
              {message.source.kind === 'social' ? <span>{sourceLabel}</span> : null}
              {message.source.kind !== 'social' ? (
                <span className="sr-only">{sourceLabel}</span>
              ) : null}
            </span>
            <time dateTime={new Date(message.createdAt).toISOString()} title={title}>
              {time}
            </time>
          </div>
        </div>
        <ChatContextMenu
          disabled={message.kind === 'pending'}
          label={t('messageActions.label', { name: message.sender.name })}
          actions={(close) =>
            message.kind === 'user' ? (
              <ChatMessageActions
                message={message}
                owner={owner}
                onMention={onMention}
                onPrivate={onPrivate}
                onCopied={close}
              />
            ) : null
          }
        >
          {(target, keyboard) => (
            <div
              {...target}
              className={`chat-message__line chat-message-entry${message.kind === 'pending' ? ' chat-delivery-line' : ''}${highlight ? ' is-highlighted' : ''}${message.kind === 'user' && message.mentioned && message.sender.playerUuid !== owner ? ' is-mentioned' : ''}`}
              data-chat-message={message.kind === 'user' ? message.id : undefined}
              data-delivery={message.kind === 'pending' ? message.status : undefined}
              aria-busy={(message.kind === 'pending' && message.status === 'sending') || undefined}
              tabIndex={-1}
              title={title}
            >
              {message.kind === 'user' ? (
                <button
                  {...keyboard}
                  className="chat-context-keyboard"
                  aria-describedby={contentId}
                />
              ) : null}
              <p className="chat-message__text" id={contentId}>
                <ChatMessageContent
                  content={message.kind === 'user' ? message.content : [{ text: message.text }]}
                />
                <span ref={attach} className="chat-read-sentinel" aria-hidden="true" />
              </p>
              {message.kind === 'pending' ? (
                <ChatDeliveryFeedback message={message} onRestore={onRestore} />
              ) : null}
            </div>
          )}
        </ChatContextMenu>
      </div>
    </article>
  );
});
