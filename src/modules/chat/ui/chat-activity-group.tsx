'use client';

import { useTranslations } from 'next-intl';
import type { ChatServerMessage } from '@/modules/chat/model/chat-protocol';
import { ChatMessageContent } from '@/modules/chat/ui/chat-message-content';
import { useChatMessageContent } from '@/modules/chat/ui/use-chat-message-content';

/** Consecutive presence events share a compact group while every event stays visible. */
export function ChatActivityGroup({
  messages,
  highlighted,
  formatTime,
}: {
  messages: ChatServerMessage[];
  highlighted: string | null;
  formatTime: (timestamp: number) => string;
}) {
  const t = useTranslations('chat');
  const content = useChatMessageContent();
  return (
    <ul
      className="chat-activity-group"
      aria-label={t('activity.count', { count: messages.length })}
    >
      {messages.map((message) => (
        <li
          key={message.id}
          data-chat-message={message.id}
          tabIndex={-1}
          className={`chat-activity-line${highlighted === message.id ? ' is-highlighted' : ''}`}
        >
          <span>
            <ChatMessageContent content={content(message)} />
          </span>
          <time dateTime={new Date(message.createdAt).toISOString()}>
            {formatTime(message.createdAt)}
          </time>
        </li>
      ))}
    </ul>
  );
}
