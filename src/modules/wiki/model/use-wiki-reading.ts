'use client';

import { useEffect, useState } from 'react';
import type { WikiHeadingPosition } from '@/modules/wiki/lib/wiki-outline';
import {
  captureWikiReadingAnchor,
  getActiveWikiSlug,
  resolveWikiReadingAnchor,
} from '@/modules/wiki/lib/wiki-outline';
import type { WikiSectionOutlineItem } from '@/modules/wiki/model/wiki-section-types';

interface WikiScrollTarget {
  sectionId: string;
  slug: string;
  focus: boolean;
  smooth: boolean;
  scrollY?: number;
  onlyIfAbove?: boolean;
  minScrollY?: number;
}

function getScrollOffset(element: HTMLElement): number {
  return Number.parseFloat(window.getComputedStyle(element).scrollMarginTop) || 0;
}

export function useWikiReading(
  sectionId: string,
  items: WikiSectionOutlineItem[],
  enabled: boolean,
) {
  const [article, setArticle] = useState<HTMLElement | null>(null);
  const [scrollTarget, requestScroll] = useState<WikiScrollTarget | null>(null);
  const [activeSlug, setActiveSlug] = useState('');

  useEffect(() => {
    if (!enabled || !article || article.dataset.section !== sectionId) return;
    if (!scrollTarget || scrollTarget.sectionId !== sectionId) return;

    const heading =
      scrollTarget.slug && scrollTarget.scrollY === undefined
        ? document.getElementById(scrollTarget.slug)
        : (article.querySelector<HTMLElement>('.wiki-markdown__h1') ?? article);
    if (!heading || !article.contains(heading)) {
      requestScroll(null);
      return;
    }

    const top =
      scrollTarget.scrollY ??
      Math.max(
        scrollTarget.minScrollY ?? 0,
        heading.getBoundingClientRect().top + window.scrollY - getScrollOffset(heading),
      );
    if (scrollTarget.focus) heading.focus({ preventScroll: true });
    // Changing articles should reveal a scrolled-past title without pushing the page down.
    if (!scrollTarget.onlyIfAbove || top < window.scrollY) {
      window.scrollTo({
        top,
        behavior:
          scrollTarget.smooth && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
            ? 'smooth'
            : 'instant',
      });
    }
    requestScroll(null);
  }, [article, enabled, scrollTarget, sectionId]);

  useEffect(() => {
    setActiveSlug('');
    if (!enabled || !article || article.dataset.section !== sectionId) return;

    let positions: WikiHeadingPosition[] = [];
    let offset = 0;
    let frame = 0;
    let articleWidth = 0;
    let articleTop = 0;
    let articleBottom = 0;
    let readingLine = window.scrollY;
    const updateActive = () => {
      frame = 0;
      readingLine = window.scrollY + offset;
      const atDocumentEnd =
        window.scrollY > 0 &&
        window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
      setActiveSlug(getActiveWikiSlug(positions, window.scrollY + offset + 2, atDocumentEnd));
    };
    const scheduleActive = () => {
      if (!frame) frame = window.requestAnimationFrame(updateActive);
    };
    const measure = () => {
      const rect = article.getBoundingClientRect();
      const nextOffset = getScrollOffset(article);
      const layoutChanged =
        articleWidth > 0 && (Math.abs(rect.width - articleWidth) > 1 || nextOffset !== offset);
      const anchor = layoutChanged
        ? captureWikiReadingAnchor(
            [{ slug: '', top: articleTop }, ...positions],
            readingLine,
            articleBottom,
          )
        : null;
      positions = items.flatMap((item) => {
        const heading = document.getElementById(item.slug);
        return heading && article.contains(heading)
          ? [{ slug: item.slug, top: heading.getBoundingClientRect().top + window.scrollY }]
          : [];
      });
      articleWidth = rect.width;
      articleTop = rect.top + window.scrollY;
      articleBottom = rect.bottom + window.scrollY;
      offset = nextOffset;
      if (anchor) {
        const nextReadingLine = resolveWikiReadingAnchor(
          [{ slug: '', top: articleTop }, ...positions],
          anchor,
          articleBottom,
        );
        if (nextReadingLine !== undefined) {
          // Preserve the chapter and relative position when rotation or split view reflows text.
          window.scrollTo({ top: Math.max(0, nextReadingLine - offset), behavior: 'instant' });
        }
      }
      readingLine = window.scrollY + offset;
      scheduleActive();
    };

    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(article);
    const layout = article.closest('.wiki-page__layout');
    if (layout) observer?.observe(layout);
    const headerOffsetObserver = new MutationObserver(() => {
      if (getScrollOffset(article) !== offset) measure();
    });
    headerOffsetObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style'],
    });
    article.addEventListener('load', measure, true);
    window.addEventListener('scroll', scheduleActive, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      headerOffsetObserver.disconnect();
      article.removeEventListener('load', measure, true);
      window.removeEventListener('scroll', scheduleActive);
      window.removeEventListener('resize', measure);
      window.cancelAnimationFrame(frame);
    };
  }, [article, enabled, items, sectionId]);

  return { articleRef: setArticle, activeSlug, requestScroll };
}
