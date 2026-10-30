'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function AnnouncementBody({ content }: { content: string }) {
  return (
    <div className="announcement-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        allowedElements={[
          'p',
          'br',
          'strong',
          'em',
          'del',
          'a',
          'code',
          'pre',
          'ul',
          'ol',
          'li',
          'blockquote',
          'h1',
          'h2',
          'h3',
          'h4',
          'h5',
          'h6',
          'hr',
          'table',
          'thead',
          'tbody',
          'tr',
          'th',
          'td',
        ]}
        components={{
          h1: 'h4',
          h2: 'h4',
          h3: 'h4',
          h4: 'h4',
          h5: 'h4',
          h6: 'h4',
          table: ({ children }) => (
            <div className="announcement-prose__table">
              <table>{children}</table>
            </div>
          ),
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

/** Keep previews as phrasing content so they remain valid inside the opening button. */
export function AnnouncementPreview({ content }: { content: string }) {
  return (
    <span className="announcement-preview">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        allowedElements={[
          'p',
          'strong',
          'em',
          'code',
          'br',
          'li',
          'blockquote',
          'h1',
          'h2',
          'h3',
          'h4',
          'h5',
          'h6',
        ]}
        unwrapDisallowed
        components={{
          p: ({ children }) => <span>{children} </span>,
          li: ({ children }) => <span>{children}; </span>,
          blockquote: 'span',
          h1: 'span',
          h2: 'span',
          h3: 'span',
          h4: 'span',
          h5: 'span',
          h6: 'span',
        }}
      >
        {content}
      </ReactMarkdown>
    </span>
  );
}
