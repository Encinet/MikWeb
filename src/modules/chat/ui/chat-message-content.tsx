import { Fragment } from 'react';
import type { ChatMessage } from '@/modules/chat/model/chat-protocol';

/** Render validated text/link runs without HTML, Markdown or a second link parser. */
export function ChatMessageContent({ content }: Pick<ChatMessage, 'content'>) {
  let offset = 0;
  return content.map((part) => {
    const start = offset;
    offset += part.text.length;
    return (
      <Fragment key={start}>
        {part.href ? (
          <a
            href={part.href}
            title={part.href}
            target={/^https?:/i.test(part.href) ? '_blank' : undefined}
            rel="noopener noreferrer ugc"
            referrerPolicy="no-referrer"
          >
            {part.text}
          </a>
        ) : part.mention ? (
          <span className="chat-mention">{part.text}</span>
        ) : (
          part.text
        )}
      </Fragment>
    );
  });
}
