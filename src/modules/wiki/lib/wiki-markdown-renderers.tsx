'use client';

import { motion } from 'framer-motion';
import type React from 'react';

import { markdownDelays, spring } from '@/modules/wiki/lib/wiki-browser-config';

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
        style={{
          color: 'var(--theme-text-heading)',
          borderColor: 'var(--theme-border-glass-light)',
        }}
        className="mb-6 border-b pb-3 text-3xl font-bold"
      >
        {children}
      </motion.h1>
    ),
    h2: ({ children }: React.PropsWithChildren) => (
      <motion.h2
        {...baseMotionProps}
        transition={{ ...spring.gentle, delay: markdownDelays.h2 }}
        style={{ color: 'var(--theme-text-heading)' }}
        className="mt-8 mb-4 text-2xl font-semibold"
      >
        {children}
      </motion.h2>
    ),
    h3: ({ children }: React.PropsWithChildren) => (
      <motion.h3
        {...baseMotionProps}
        transition={{ ...spring.gentle, delay: markdownDelays.h3 }}
        style={{ color: 'var(--theme-text-primary)' }}
        className="mt-6 mb-3 text-xl font-semibold"
      >
        {children}
      </motion.h3>
    ),
    p: ({ children }: React.PropsWithChildren) => (
      <motion.p
        {...baseMotionProps}
        transition={{ ...spring.gentle, delay: markdownDelays.p }}
        style={{ color: 'var(--theme-text-muted-strong)' }}
        className="mb-4 leading-relaxed"
      >
        {children}
      </motion.p>
    ),
    ul: ({ children }: React.PropsWithChildren) => (
      <motion.ul
        {...baseMotionProps}
        transition={{ ...spring.gentle, delay: markdownDelays.list }}
        style={{ color: 'var(--theme-text-muted-strong)' }}
        className="mb-4 list-disc list-inside space-y-2"
      >
        {children}
      </motion.ul>
    ),
    ol: ({ children }: React.PropsWithChildren) => (
      <motion.ol
        {...baseMotionProps}
        transition={{ ...spring.gentle, delay: markdownDelays.list }}
        style={{ color: 'var(--theme-text-muted-strong)' }}
        className="mb-4 list-decimal list-inside space-y-2"
      >
        {children}
      </motion.ol>
    ),
    li: ({ children }: React.PropsWithChildren) => (
      <li style={{ color: 'var(--theme-text-muted-strong)' }} className="ml-4">
        {children}
      </li>
    ),
    blockquote: ({ children }: React.PropsWithChildren) => (
      <motion.blockquote
        {...baseMotionProps}
        transition={{ ...spring.gentle, delay: markdownDelays.block }}
        style={{
          background: 'var(--theme-surface-glass-light)',
          borderLeftColor: 'var(--theme-border-blue-accent)',
          borderColor: 'var(--theme-border-glass-light)',
        }}
        className="my-4 rounded-lg border border-l-4 py-1 pl-4 backdrop-blur-sm [&>p:last-child]:mb-0 [&>p]:mb-0"
      >
        {children}
      </motion.blockquote>
    ),
    pre: ({ children }: React.PropsWithChildren) => (
      <motion.pre
        {...baseMotionProps}
        transition={{ ...spring.gentle, delay: markdownDelays.block }}
        style={{
          background: 'var(--theme-surface-code-block)',
          borderColor: 'var(--theme-border-glass-light)',
        }}
        className="mb-4 overflow-x-auto rounded-lg border p-4"
      >
        {children}
      </motion.pre>
    ),
    code: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => {
      const isInline = !className;

      return isInline ? (
        <code
          style={{
            background: 'var(--theme-surface-code)',
            color: 'var(--theme-accent-blue-strong)',
          }}
          className="rounded px-1.5 py-0.5 font-mono text-sm"
        >
          {children}
        </code>
      ) : (
        <code
          style={{ color: 'var(--theme-accent-blue-strong)' }}
          className="block font-mono text-sm"
        >
          {children}
        </code>
      );
    },
    a: ({ children, href }: React.PropsWithChildren<{ href?: string }>) => (
      <a
        href={href}
        className="ui-content-link ui-content-link--blue"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
    table: ({ children }: React.PropsWithChildren) => (
      <motion.div
        {...baseMotionProps}
        transition={{ ...spring.gentle, delay: markdownDelays.block }}
        className="my-4 overflow-x-auto rounded-lg border"
        style={{ borderColor: 'var(--theme-border-glass-light)' }}
      >
        <table className="min-w-full">{children}</table>
      </motion.div>
    ),
    thead: ({ children }: React.PropsWithChildren) => (
      <thead style={{ background: 'var(--theme-surface-glass-light)' }}>{children}</thead>
    ),
    th: ({ children }: React.PropsWithChildren) => (
      <th
        style={{
          color: 'var(--theme-text-heading)',
          borderColor: 'var(--theme-border-glass-light)',
        }}
        className="border-b px-4 py-2 text-left font-semibold"
      >
        {children}
      </th>
    ),
    td: ({ children }: React.PropsWithChildren) => (
      <td
        style={{
          color: 'var(--theme-text-muted-strong)',
          borderColor: 'var(--theme-border-light)',
        }}
        className="border-b px-4 py-2"
      >
        {children}
      </td>
    ),
  };
}
