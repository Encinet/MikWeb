'use client';

import { useEffect, useState } from 'react';
import type { WikiHeadingPosition } from '@/modules/wiki/lib/wiki-outline';
import { getActiveWikiSlug } from '@/modules/wiki/lib/wiki-outline';
import type { WikiSectionOutlineItem } from '@/modules/wiki/model/wiki-section-types';

interface WikiScrollTarget {
  sectionId: string;
  slug: string;
  focus: boolean;
  smooth: boolean;
  scrollY?: number;
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
      Math.max(0, heading.getBoundingClientRect().top + window.scrollY - getScrollOffset(heading));
    if (scrollTarget.focus) heading.focus({ preventScroll: true });
    window.scrollTo({
      top,
      behavior:
        scrollTarget.smooth && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'smooth'
          : 'instant',
    });
    requestScroll(null);
  }, [article, enabled, scrollTarget, sectionId]);

  useEffect(() => {
    setActiveSlug('');
    if (!enabled || !article || article.dataset.section !== sectionId) return;

    let positions: WikiHeadingPosition[] = [];
    let offset = 0;
    let frame = 0;
    const updateActive = () => {
      frame = 0;
      const atDocumentEnd =
        window.scrollY > 0 &&
        window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
      setActiveSlug(getActiveWikiSlug(positions, window.scrollY + offset + 2, atDocumentEnd));
    };
    const scheduleActive = () => {
      if (!frame) frame = window.requestAnimationFrame(updateActive);
    };
    const measure = () => {
      positions = items.flatMap((item) => {
        const heading = document.getElementById(item.slug);
        return heading && article.contains(heading)
          ? [{ slug: item.slug, top: heading.getBoundingClientRect().top + window.scrollY }]
          : [];
      });
      offset = getScrollOffset(article);
      scheduleActive();
    };

    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(article);
    const layout = article.closest('.wiki-page__layout');
    if (layout) observer?.observe(layout);
    article.addEventListener('load', measure, true);
    window.addEventListener('scroll', scheduleActive, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      article.removeEventListener('load', measure, true);
      window.removeEventListener('scroll', scheduleActive);
      window.removeEventListener('resize', measure);
      window.cancelAnimationFrame(frame);
    };
  }, [article, enabled, items, sectionId]);

  return { articleRef: setArticle, activeSlug, requestScroll };
}
