'use client';

import { Gamepad2, Globe } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { memo, useCallback, useId } from 'react';
import type { PendingChatMessage } from '@/modules/chat/model/chat-delivery';
import type { ChatPlayerMessage } from '@/modules/chat/model/chat-protocol';
import { messageCursor } from '@/modules/chat/model/chat-reading';
import type { ChatPendingEntry } from '@/modules/chat/model/chat-timeline';
import { ChatContextMenu } from '@/modules/chat/ui/chat-context-menu';
import { ChatDeliveryFeedback } from '@/modules/chat/ui/chat-delivery-feedback';
import type { ChatMessageActionHandlers } from '@/modules/chat/ui/chat-message-actions';
import { ChatMessageActions } from '@/modules/chat/ui/chat-message-actions';
import { ChatMessageContent } from '@/modules/chat/ui/chat-message-content';
import type { useChatReadTracker } from '@/modules/chat/ui/use-chat-read-tracker';
import MinecraftAvatar from '@/modules/player/ui/minecraft-avatar';

/** A message keeps its DOM identity when grouping changes around it. */
export const ChatPlayerMessageRow = memo(function ChatPlayerMessageRow({
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
  message: ChatPlayerMessage | ChatPendingEntry;
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
      message.kind === 'player' ? track(element, messageCursor(message)) : undefined,
    [track, message],
  );
  const SourceIcon = message.source === 'game' ? Gamepad2 : Globe;
  return (
    <article
      className={`chat-message${message.senderUuid === owner ? ' is-own' : ''}${startsGroup ? '' : ' is-continuation'}`}
      aria-label={message.senderName}
    >
      <div className="chat-message__avatar" aria-hidden="true">
        <MinecraftAvatar uuid={message.senderUuid} name={message.senderName} size={40} />
      </div>
      <div className="chat-message__content">
        <div
          className="chat-message__author"
          aria-hidden={!startsGroup || undefined}
          inert={!startsGroup}
        >
          <div className="chat-message__meta">
            <strong>{message.senderName}</strong>
            <span className="chat-message__source" title={t(`source.${message.source}`)}>
              <SourceIcon size={13} aria-hidden="true" />
              <span className="sr-only">{t(`source.${message.source}`)}</span>
            </span>
            <time dateTime={new Date(message.createdAt).toISOString()} title={title}>
              {time}
            </time>
          </div>
        </div>
        <ChatContextMenu
          disabled={message.kind === 'pending'}
          label={t('messageActions.label', { name: message.senderName })}
          actions={(close) =>
            message.kind === 'player' ? (
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
              className={`chat-message__line chat-message-entry${message.kind === 'pending' ? ' chat-delivery-line' : ''}${highlight ? ' is-highlighted' : ''}${message.kind === 'player' && message.mentioned && message.senderUuid !== owner ? ' is-mentioned' : ''}`}
              data-chat-message={message.kind === 'player' ? message.id : undefined}
              data-delivery={message.kind === 'pending' ? message.status : undefined}
              aria-busy={(message.kind === 'pending' && message.status === 'sending') || undefined}
              tabIndex={-1}
              title={title}
            >
              {message.kind === 'player' ? (
                <button
                  {...keyboard}
                  className="chat-context-keyboard"
                  aria-describedby={contentId}
                />
              ) : null}
              <p className="chat-message__text" id={contentId}>
                <ChatMessageContent
                  content={message.kind === 'player' ? message.content : [{ text: message.text }]}
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
