import type { CSSProperties } from 'react';
import { Fragment } from 'react';
import { findChatCoordinates } from '@/modules/chat/lib/chat-coordinates';
import type { ChatContent, ChatStyle } from '@/modules/chat/model/chat-protocol';
import { ChatCoordinate } from '@/modules/chat/ui/chat-coordinate';

/** Fixed CSS properties, RGB integers and decoration flags; never accept CSS from a message. */
function textStyle(style: ChatStyle): CSSProperties {
  const rgb = (color: number) => `#${color.toString(16).padStart(6, '0')}`;
  const color = style.color === undefined ? undefined : rgb(style.color);
  const endColor = style.gradientEndColor === undefined ? undefined : rgb(style.gradientEndColor);
  const gradient = color && endColor ? `linear-gradient(90deg, ${color}, ${endColor})` : undefined;
  return {
    color: gradient ? 'transparent' : color,
    backgroundImage: gradient,
    backgroundClip: gradient ? 'text' : undefined,
    textDecorationColor: gradient ? color : undefined,
    fontWeight: style.bold ? 700 : undefined,
    fontStyle: style.italic ? 'italic' : undefined,
    textDecorationLine:
      [style.underlined && 'underline', style.strikethrough && 'line-through']
        .filter(Boolean)
        .join(' ') || undefined,
  };
}

/** All message text stays in React text nodes, including HTML and MiniMessage-looking literals. */
export function ChatMessageContent({ content }: { content: ChatContent }) {
  let offset = 0;
  return content.map((part) => {
    const start = offset;
    offset += part.text.length;
    const matches = !part.href && !part.mention ? findChatCoordinates(part.text) : [];
    let cursor = 0;
    const pieces = matches.map((coordinate) => {
      const before = part.text.slice(cursor, coordinate.start);
      cursor = coordinate.end;
      return (
        <Fragment key={coordinate.start}>
          {before}
          <ChatCoordinate coordinate={coordinate} />
        </Fragment>
      );
    });
    const value = matches.length ? (
      <>
        {pieces}
        {part.text.slice(cursor)}
      </>
    ) : (
      part.text
    );
    const text = part.style ? <span style={textStyle(part.style)}>{value}</span> : value;
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
            {text}
          </a>
        ) : part.mention ? (
          <span className="chat-mention">{text}</span>
        ) : (
          text
        )}
      </Fragment>
    );
  });
}
