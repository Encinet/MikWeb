'use client';

import { useLayoutEffect } from 'react';
import { readViewportBounds } from '@/shared/lib/viewport-bounds';

/** Publish the visible screen for fixed surfaces while preserving normal page flow and pinch zoom. */
export function ViewportMetrics() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const viewport = window.visualViewport;
    const properties = ['left', 'top', 'width', 'height'] as const;
    const previous = properties.map((key) =>
      root.style.getPropertyValue(`--visual-viewport-${key}`),
    );
    let frame: number | null = null;
    const measure = () => {
      frame = null;
      if (viewport && viewport.scale !== 1) return;
      const bounds = readViewportBounds();
      if (bounds.width <= 0 || bounds.height <= 0) return;
      for (const key of properties)
        root.style.setProperty(`--visual-viewport-${key}`, `${bounds[key]}px`);
    };
    const schedule = () => {
      if (frame === null) frame = window.requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('resize', schedule);
    window.addEventListener('pageshow', schedule);
    viewport?.addEventListener('resize', schedule);
    viewport?.addEventListener('scroll', schedule);
    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('pageshow', schedule);
      viewport?.removeEventListener('resize', schedule);
      viewport?.removeEventListener('scroll', schedule);
      properties.forEach((key, index) => {
        const property = `--visual-viewport-${key}`;
        if (previous[index]) root.style.setProperty(property, previous[index]);
        else root.style.removeProperty(property);
      });
    };
  }, []);
  return null;
}
