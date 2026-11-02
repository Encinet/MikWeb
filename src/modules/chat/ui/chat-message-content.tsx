import type { CSSProperties } from 'react';
import { Fragment } from 'react';
import type { ChatContent, ChatStyle } from '@/modules/chat/model/chat-protocol';

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
    const text = part.style ? <span style={textStyle(part.style)}>{part.text}</span> : part.text;
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
