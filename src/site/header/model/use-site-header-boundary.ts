'use client';

import type { RefObject } from 'react';
import { useLayoutEffect } from 'react';

/** Publish the fixed header's occupied space separately from the page's opening gutter. */
export function useSiteHeaderBoundary(ref: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const header = ref.current;
    if (!header) return;

    const root = document.documentElement;
    const property = '--site-header-bottom';
    const previousValue = root.style.getPropertyValue(property);
    const measure = () => {
      const bottom = header.getBoundingClientRect().bottom;
      if (bottom <= 0) return;
      const value = `${bottom}px`;
      if (root.style.getPropertyValue(property) !== value) root.style.setProperty(property, value);
    };

    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(header);
    window.addEventListener('resize', measure);
    window.visualViewport?.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
      window.visualViewport?.removeEventListener('resize', measure);
      if (previousValue) root.style.setProperty(property, previousValue);
      else root.style.removeProperty(property);
    };
  }, [ref]);
}
