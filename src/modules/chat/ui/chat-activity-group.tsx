'use client';

import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ChatServerMessage } from '@/modules/chat/model/chat-protocol';
import { ChatMessageContent } from '@/modules/chat/ui/chat-message-content';
import { useChatMessageContent } from '@/modules/chat/ui/use-chat-message-content';

/** Passive presence events remain discoverable without competing with actual conversation. */
export function ChatActivityGroup({
  messages,
  highlighted,
  revealedId,
  formatTime,
}: {
  messages: ChatServerMessage[];
  highlighted: string | null;
  revealedId: string | null;
  formatTime: (timestamp: number) => string;
}) {
  const t = useTranslations('chat');
  const content = useChatMessageContent();
  const forcedOpen = messages.some(
    (message) => message.id === highlighted || message.id === revealedId,
  );
  return (
    <details className="chat-activity-group" open={forcedOpen || undefined}>
      <summary>
        <ChevronDown size={13} aria-hidden="true" />
        <span>{t('activity.count', { count: messages.length })}</span>
        <time dateTime={new Date(messages.at(-1)?.createdAt ?? 0).toISOString()}>
          {formatTime(messages.at(-1)?.createdAt ?? 0)}
        </time>
      </summary>
      <div>
        {messages.map((message) => (
          <p
            key={message.id}
            data-chat-message={message.id}
            tabIndex={-1}
            className={`chat-activity-line${highlighted === message.id ? ' is-highlighted' : ''}`}
          >
            <ChatMessageContent content={content(message)} />
            <time dateTime={new Date(message.createdAt).toISOString()}>
              {formatTime(message.createdAt)}
            </time>
          </p>
        ))}
      </div>
    </details>
  );
}
