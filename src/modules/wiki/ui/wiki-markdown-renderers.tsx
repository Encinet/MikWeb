'use client';

import type React from 'react';

type MarkdownTableCellProps = React.PropsWithChildren<
  React.ThHTMLAttributes<HTMLTableCellElement> &
    React.TdHTMLAttributes<HTMLTableCellElement> & {
      node?: unknown;
    }
>;

export function createWikiMarkdownRenderers() {
  return {
    h1: ({ children, id }: React.PropsWithChildren<{ id?: string }>) => (
      <h2 id={id} tabIndex={-1} className="wiki-markdown__h1">
        {children}
      </h2>
    ),
    h2: ({ children, id }: React.PropsWithChildren<{ id?: string }>) => (
      <h3 id={id} tabIndex={-1} className="wiki-markdown__h2">
        {children}
      </h3>
    ),
    h3: ({ children, id }: React.PropsWithChildren<{ id?: string }>) => (
      <h4 id={id} tabIndex={-1} className="wiki-markdown__h3">
        {children}
      </h4>
    ),
    p: ({ children }: React.PropsWithChildren) => <p className="wiki-markdown__p">{children}</p>,
    ul: ({ children }: React.PropsWithChildren) => (
      <ul className="wiki-markdown__list wiki-markdown__list--unordered">{children}</ul>
    ),
    ol: ({ children, start }: React.PropsWithChildren<{ start?: number }>) => (
      <ol start={start} className="wiki-markdown__list wiki-markdown__list--ordered">
        {children}
      </ol>
    ),
    li: ({ children }: React.PropsWithChildren) => (
      <li className="wiki-markdown__li">{children}</li>
    ),
    blockquote: ({ children }: React.PropsWithChildren) => (
      <blockquote className="wiki-markdown__blockquote">{children}</blockquote>
    ),
    pre: ({ children }: React.PropsWithChildren) => (
      <pre className="wiki-markdown__pre">{children}</pre>
    ),
    code: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => (
      <code className={['wiki-markdown__code', className].filter(Boolean).join(' ')}>
        {children}
      </code>
    ),
    a: ({ children, href }: React.PropsWithChildren<{ href?: string }>) => (
      <a
        href={href}
        className="wiki-markdown__link"
        target={/^https?:\/\//i.test(href ?? '') ? '_blank' : undefined}
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
    table: ({ children }: React.PropsWithChildren) => (
      <div className="wiki-markdown__table-wrap">
        <table className="wiki-markdown__table">{children}</table>
      </div>
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
