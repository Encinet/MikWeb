'use client';

import type { UIEvent } from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';

interface ScrollPosition {
  top: number;
  atBottom: boolean;
  count: number;
}

/** Conversation positions survive switching rooms and the full-screen connection gate. */
export function useChatScroll(conversation: string) {
  const log = useRef<HTMLDivElement | null>(null);
  const positions = useRef(new Map<string, ScrollPosition>());
  const nearBottom = useRef(true);
  const [atBottom, setAtBottom] = useState(true);

  const attach = useCallback(
    (element: HTMLDivElement | null) => {
      if (!element) return;
      log.current = element;
      const previous = positions.current.get(conversation);
      element.scrollTop = previous?.atBottom === false ? previous.top : element.scrollHeight;
      nearBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80;
      setAtBottom(nearBottom.current);
      const observer = new ResizeObserver(() => {
        if (nearBottom.current) element.scrollTop = element.scrollHeight;
        nearBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80;
        setAtBottom(nearBottom.current);
      });
      observer.observe(element);
      if (element.firstElementChild) observer.observe(element.firstElementChild);
      return () => {
        observer.disconnect();
        positions.current.set(conversation, {
          top: element.scrollTop,
          atBottom: nearBottom.current,
          count: element.querySelectorAll('[data-chat-message]').length,
        });
        if (log.current === element) log.current = null;
      };
    },
    [conversation],
  );

  const onScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    nearBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80;
    setAtBottom(nearBottom.current);
  }, []);

  const toLatest = useCallback(() => {
    nearBottom.current = true;
    setAtBottom(true);
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, []);

  const toMessage = useCallback((id: string, focus = false) => {
    const element = log.current;
    const message = Array.from(
      element?.querySelectorAll<HTMLElement>('[data-chat-message]') ?? [],
    ).find((node) => node.dataset.chatMessage === id);
    if (!element || !message) return;
    const disclosure = message.closest('details');
    if (disclosure) disclosure.open = true;
    const top =
      element.scrollTop +
      message.getBoundingClientRect().top -
      element.getBoundingClientRect().top -
      element.clientTop -
      24;
    element.scrollTop = Math.max(0, Math.min(top, element.scrollHeight - element.clientHeight));
    nearBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80;
    setAtBottom(nearBottom.current);
    if (focus) message.focus({ preventScroll: true });
  }, []);
  const initialView = useCallback(() => positions.current.get(conversation), [conversation]);

  return useMemo(
    () => ({ attach, atBottom, onScroll, toLatest, toMessage, initialView, log }),
    [attach, atBottom, onScroll, toLatest, toMessage, initialView],
  );
}
