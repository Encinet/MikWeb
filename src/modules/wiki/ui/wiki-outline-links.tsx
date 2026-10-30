'use client';

import type { MouseEvent } from 'react';
import { useEffect, useMemo, useRef } from 'react';
import { getWikiSectionHref, groupWikiOutline } from '@/modules/wiki/lib/wiki-outline';
import type { WikiSectionOutlineItem } from '@/modules/wiki/model/wiki-section-types';

interface WikiOutlineLinksProps {
  activeSlug: string;
  sectionId: string;
  items: WikiSectionOutlineItem[];
  label: string;
  onOpen: (item: WikiSectionOutlineItem) => void;
  visible?: boolean;
}

export function WikiOutlineLinks({
  activeSlug,
  sectionId,
  items,
  label,
  onOpen,
  visible = true,
}: WikiOutlineLinksProps) {
  const groups = useMemo(() => groupWikiOutline(items), [items]);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (
      !activeSlug ||
      !visible ||
      !viewport?.clientHeight ||
      viewport.contains(document.activeElement)
    )
      return;
    const activeLink = viewport.querySelector<HTMLElement>('[aria-current="location"]');
    if (!activeLink) return;
    const linkRect = activeLink.getBoundingClientRect();
    const viewportRect = viewport.getBoundingClientRect();
    if (linkRect.top < viewportRect.top + 8)
      viewport.scrollTop += linkRect.top - viewportRect.top - 8;
    else if (linkRect.bottom > viewportRect.bottom - 8)
      viewport.scrollTop += linkRect.bottom - viewportRect.bottom + 8;
  }, [activeSlug, visible]);

  if (items.length === 0) return null;

  const handleOpen = (event: MouseEvent<HTMLAnchorElement>, item: WikiSectionOutlineItem) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    event.preventDefault();
    onOpen(item);
  };
  const renderLink = (item: WikiSectionOutlineItem, activeBranch = false) => (
    <a
      href={getWikiSectionHref(sectionId, item.slug)}
      aria-current={activeSlug === item.slug ? 'location' : undefined}
      onClick={(event) => handleOpen(event, item)}
      className={`wiki-outline-links__item ${item.level === 3 ? 'wiki-outline-links__item--child' : ''} ${activeBranch ? 'is-active-branch' : ''}`}
    >
      {item.heading}
    </a>
  );

  return (
    <nav className="wiki-outline-links not-prose" aria-label={label}>
      <p className="wiki-outline-links__label">{label}</p>
      <div className="wiki-outline-links__viewport" ref={viewportRef}>
        <ol className="wiki-outline-links__items">
          {groups.map((group) => (
            <li key={group.item.slug}>
              {renderLink(
                group.item,
                group.children.some((item) => item.slug === activeSlug),
              )}
              {group.children.length > 0 ? (
                <ol className="wiki-outline-links__children">
                  {group.children.map((item) => (
                    <li key={item.slug}>{renderLink(item)}</li>
                  ))}
                </ol>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}
