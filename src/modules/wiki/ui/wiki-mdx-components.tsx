'use client';

import { AlertTriangle, ChevronRight, Info } from 'lucide-react';
import type { MDXComponents } from 'mdx/types';
import type { ReactNode } from 'react';
import { Children, isValidElement, useId, useState } from 'react';
import { createWikiMarkdownRenderers } from '@/modules/wiki/ui/wiki-markdown-renderers';
import { CopyButton } from '@/shared/ui/action/copy-button';

function getText(children: ReactNode): string {
  return Children.toArray(children)
    .map((child) => {
      if (typeof child === 'string' || typeof child === 'number') return String(child);
      if (isValidElement<{ children?: ReactNode }>(child)) return getText(child.props.children);
      return '';
    })
    .join('');
}

function CodeBlock({ children }: { children?: ReactNode }) {
  const code = getText(children).replace(/\n$/, '');
  return (
    <div className="wiki-code-block">
      <div className="wiki-code-block__actions">
        <CopyButton value={code} />
      </div>
      <pre className="wiki-markdown__pre">{children}</pre>
    </div>
  );
}

function Callout({
  title,
  kind = 'note',
  children,
}: {
  title: string;
  kind?: 'note' | 'warning';
  children?: ReactNode;
}) {
  const titleId = useId();
  const Icon = kind === 'warning' ? AlertTriangle : Info;
  return (
    <aside className="wiki-callout" data-kind={kind} aria-labelledby={titleId}>
      <div className="wiki-callout__heading">
        <Icon className="wiki-callout__icon" aria-hidden="true" />
        <strong id={titleId} className="wiki-callout__title">
          {title}
        </strong>
      </div>
      <div className="wiki-callout__body">{children}</div>
    </aside>
  );
}

function Steps({ children }: { children?: ReactNode }) {
  return <ol className="wiki-steps">{children}</ol>;
}

function Step({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <li>
      <strong className="wiki-step__title">{title}</strong>
      <div className="wiki-step__body">{children}</div>
    </li>
  );
}

function Cards({ children }: { children?: ReactNode }) {
  return <div className="wiki-cards">{children}</div>;
}

function Card({ title, href, children }: { title: string; href: string; children?: ReactNode }) {
  const external = /^https?:\/\//i.test(href);
  return (
    <a
      className="wiki-card"
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
    >
      <strong className="wiki-card__title">
        {title}
        <ChevronRight className="wiki-card__icon h-4 w-4" aria-hidden="true" />
      </strong>
      <div className="wiki-card__body">{children}</div>
    </a>
  );
}

function Details({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <details className="wiki-details">
      <summary className="wiki-details__summary">
        <span>{title}</span>
        <ChevronRight className="wiki-details__chevron" aria-hidden="true" />
      </summary>
      <div className="wiki-details__body">{children}</div>
    </details>
  );
}

function Definitions({ children }: { children?: ReactNode }) {
  return <dl className="wiki-definitions">{children}</dl>;
}

function Definition({
  title,
  code = false,
  children,
}: {
  title: string;
  code?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="wiki-definition">
      <dt className="wiki-definition__term">
        {code ? <code className="wiki-markdown__code">{title}</code> : title}
      </dt>
      <dd className="wiki-definition__body">{children}</dd>
    </div>
  );
}

interface TabProps {
  value: string;
  title: string;
  children?: ReactNode;
}

function Tab({ children }: TabProps) {
  return children;
}

function Tabs({ defaultValue, children }: { defaultValue: string; children?: ReactNode }) {
  const id = useId();
  const [selected, setSelected] = useState(defaultValue);
  const tabs = Children.toArray(children).filter(isValidElement<TabProps>);
  const active = tabs.some((tab) => tab.props.value === selected) ? selected : tabs[0]?.props.value;
  return (
    <div className="wiki-tabs">
      <div role="tablist" className="wiki-tabs__list">
        {tabs.map(({ props }, index) => (
          <button
            key={props.value}
            id={`${id}-${props.value}-tab`}
            type="button"
            role="tab"
            aria-selected={active === props.value}
            aria-controls={`${id}-${props.value}-panel`}
            tabIndex={active === props.value ? 0 : -1}
            onClick={() => setSelected(props.value)}
            onKeyDown={(event) => {
              const next =
                event.key === 'ArrowRight'
                  ? (index + 1) % tabs.length
                  : event.key === 'ArrowLeft'
                    ? (index - 1 + tabs.length) % tabs.length
                    : event.key === 'Home'
                      ? 0
                      : event.key === 'End'
                        ? tabs.length - 1
                        : null;
              if (next === null) return;
              event.preventDefault();
              setSelected(tabs[next].props.value);
              event.currentTarget.parentElement
                ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
                [next]?.focus();
            }}
          >
            {props.title}
          </button>
        ))}
      </div>
      {tabs.map(({ props }) => (
        <div
          key={props.value}
          id={`${id}-${props.value}-panel`}
          role="tabpanel"
          aria-labelledby={`${id}-${props.value}-tab`}
          hidden={active !== props.value}
          className="wiki-tabs__panel"
        >
          {props.children}
        </div>
      ))}
    </div>
  );
}

const markdown = createWikiMarkdownRenderers();

export const wikiMdxComponents: MDXComponents = {
  ...markdown,
  pre: CodeBlock,
  ...Object.fromEntries([
    ['WikiTable', markdown.table],
    ['Callout', Callout],
    ['Steps', Steps],
    ['Step', Step],
    ['Cards', Cards],
    ['Card', Card],
    ['Details', Details],
    ['Definitions', Definitions],
    ['Definition', Definition],
    ['Tabs', Tabs],
    ['Tab', Tab],
  ]),
};
