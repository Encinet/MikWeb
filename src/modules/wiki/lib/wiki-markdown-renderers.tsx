'use client';

import { motion } from 'motion/react';
import type React from 'react';

import { markdownDelays, spring } from '@/modules/wiki/lib/wiki-browser-config';

type MarkdownTableCellProps = React.PropsWithChildren<
  React.ThHTMLAttributes<HTMLTableCellElement> &
    React.TdHTMLAttributes<HTMLTableCellElement> & {
      node?: unknown;
    }
>;

export function createWikiMarkdownRenderers() {
  const baseMotionProps = {
    initial: false,
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  };

  return {
    h1: ({ children }: React.PropsWithChildren) => (
      <motion.h1
        {...baseMotionProps}
        transition={{ ...spring.gentle, delay: markdownDelays.h1 }}
        className="wiki-markdown__h1"
      >
        {children}
      </motion.h1>
    ),
    h2: ({ children }: React.PropsWithChildren) => (
      <motion.h2
        {...baseMotionProps}
        transition={{ ...spring.gentle, delay: markdownDelays.h2 }}
        className="wiki-markdown__h2"
      >
        {children}
      </motion.h2>
    ),
    h3: ({ children }: React.PropsWithChildren) => (
      <motion.h3
        {...baseMotionProps}
        transition={{ ...spring.gentle, delay: markdownDelays.h3 }}
        className="wiki-markdown__h3"
      >
        {children}
      </motion.h3>
    ),
    p: ({ children }: React.PropsWithChildren) => (
      <motion.p
        {...baseMotionProps}
        transition={{ ...spring.gentle, delay: markdownDelays.p }}
        className="wiki-markdown__p"
      >
        {children}
      </motion.p>
    ),
    ul: ({ children }: React.PropsWithChildren) => (
      <motion.ul
        {...baseMotionProps}
        transition={{ ...spring.gentle, delay: markdownDelays.list }}
        className="wiki-markdown__list wiki-markdown__list--unordered"
      >
        {children}
      </motion.ul>
    ),
    ol: ({ children }: React.PropsWithChildren) => (
      <motion.ol
        {...baseMotionProps}
        transition={{ ...spring.gentle, delay: markdownDelays.list }}
        className="wiki-markdown__list wiki-markdown__list--ordered"
      >
        {children}
      </motion.ol>
    ),
    li: ({ children }: React.PropsWithChildren) => (
      <li className="wiki-markdown__li">{children}</li>
    ),
    blockquote: ({ children }: React.PropsWithChildren) => (
      <motion.blockquote
        {...baseMotionProps}
        transition={{ ...spring.gentle, delay: markdownDelays.block }}
        className="wiki-markdown__blockquote"
      >
        {children}
      </motion.blockquote>
    ),
    pre: ({ children }: React.PropsWithChildren) => (
      <motion.pre
        {...baseMotionProps}
        transition={{ ...spring.gentle, delay: markdownDelays.block }}
        className="wiki-markdown__pre"
      >
        {children}
      </motion.pre>
    ),
    code: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => {
      const isInline = !className;

      return isInline ? (
        <code className="wiki-markdown__code">{children}</code>
      ) : (
        <code className="wiki-markdown__code-block">{children}</code>
      );
    },
    a: ({ children, href }: React.PropsWithChildren<{ href?: string }>) => (
      <a href={href} className="wiki-markdown__link" target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ),
    table: ({ children }: React.PropsWithChildren) => (
      <motion.div
        {...baseMotionProps}
        transition={{ ...spring.gentle, delay: markdownDelays.block }}
        className="wiki-markdown__table-wrap"
      >
        <table className="wiki-markdown__table">{children}</table>
      </motion.div>
    ),
    thead: ({ children }: React.PropsWithChildren) => <thead>{children}</thead>,
    th: ({ children, node: _node, className: _className, ...props }: MarkdownTableCellProps) => (
      <th {...props}>{children}</th>
    ),
    td: ({ children, node: _node, className: _className, ...props }: MarkdownTableCellProps) => (
      <td {...props}>{children}</td>
    ),
    br: () => <br />,
  };
}
