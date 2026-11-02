'use client';

import type { RefObject } from 'react';
import { useCallback, useEffect, useEffectEvent, useRef } from 'react';
import type { ChatReadCursor } from '@/modules/chat/model/chat-reading';
import { compareCursors } from '@/modules/chat/model/chat-reading';

/** Observe message ends, including messages taller than the viewport. */
export function useChatReadTracker(
  root: RefObject<HTMLDivElement | null>,
  onRead: (cursor: ChatReadCursor) => void,
  paused: boolean,
) {
  const nodes = useRef(new Map<Element, ChatReadCursor>());
  const visible = useRef(new Set<Element>());
  const observer = useRef<IntersectionObserver | null>(null);
  const report = useEffectEvent(() => {
    const element = root.current;
    if (!element || paused || document.visibilityState !== 'visible' || !document.hasFocus())
      return;
    const bounds = element.getBoundingClientRect();
    let latest: ChatReadCursor | undefined;
    for (const node of visible.current) {
      const rect = node.getBoundingClientRect();
      const cursor = nodes.current.get(node);
      if (
        cursor &&
        rect.bottom > bounds.top &&
        rect.top < bounds.bottom &&
        (!latest || compareCursors(cursor, latest) > 0)
      )
        latest = cursor;
    }
    if (latest) onRead(latest);
  });

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const current = new IntersectionObserver(
      (entries) => {
        if (observer.current !== current) return;
        for (const entry of entries) {
          if (entry.isIntersecting) visible.current.add(entry.target);
          else visible.current.delete(entry.target);
        }
        report();
      },
      { root: element, threshold: 1 },
    );
    observer.current = current;
    for (const node of nodes.current.keys()) current.observe(node);
    window.addEventListener('focus', report);
    document.addEventListener('visibilitychange', report);
    return () => {
      current.disconnect();
      observer.current = null;
      visible.current.clear();
      window.removeEventListener('focus', report);
      document.removeEventListener('visibilitychange', report);
    };
  }, [root]);

  useEffect(() => {
    if (!paused) report();
  }, [paused]);

  return useCallback((element: HTMLSpanElement | null, cursor: ChatReadCursor) => {
    if (!element) return;
    nodes.current.set(element, cursor);
    observer.current?.observe(element);
    return () => {
      observer.current?.unobserve(element);
      nodes.current.delete(element);
      visible.current.delete(element);
    };
  }, []);
}
