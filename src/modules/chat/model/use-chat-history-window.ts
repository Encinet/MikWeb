'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { HistoryWindow } from '../lib/chat-history';
import type { ChatMessage } from './chat-protocol';
import { messageConversation } from './chat-protocol';

interface Options {
  owner: string;
  conversation: string;
  epoch: string;
  recent: ChatMessage[];
  allowed: boolean;
  latest?: ChatMessage;
  target?: string | null;
  read(
    conversation: string,
    before?: string,
    target?: string,
    after?: string,
  ): Promise<HistoryWindow>;
}
export function useChatHistoryWindow({
  owner,
  conversation,
  epoch,
  recent,
  allowed,
  latest,
  target,
  read,
}: Options) {
  const key = `${epoch}:${conversation}`;
  const generation = useRef(0);
  const busy = useRef(false);
  const visible = useRef<ChatMessage[]>([]);
  const [missing, setMissing] = useState<string | null>(null);
  const [window, setWindow] = useState({
    key: '',
    messages: [] as ChatMessage[],
    hasMore: false,
    hasNewer: false,
    older: false,
    loading: false,
    failed: false,
  });
  const load = useCallback(
    async (before?: string, targetId?: string, after?: string) => {
      const base = visible.current;
      const version = ++generation.current;
      busy.current = true;
      setWindow((previous) =>
        previous.key === key
          ? { ...previous, loading: true, failed: false }
          : {
              key,
              messages: [],
              hasMore: false,
              hasNewer: false,
              older: false,
              loading: true,
              failed: false,
            },
      );
      try {
        const page = await read(conversation, before, targetId, after);
        if (version !== generation.current) return;
        if (targetId && !page.messages.some((message) => message.id === targetId))
          setMissing(targetId);
        setWindow((previous) => ({
          key,
          messages: before
            ? [...page.messages, ...base].slice(0, 512)
            : after
              ? [...base, ...page.messages].slice(-512)
              : page.messages,
          hasMore: after
            ? previous.hasMore || base.length + page.messages.length > 512
            : page.hasMore,
          hasNewer: before
            ? previous.hasNewer || base.length + page.messages.length > 512
            : after
              ? page.hasMore
              : Boolean(targetId),
          older: Boolean(before || targetId || after),
          loading: false,
          failed: false,
        }));
      } catch {
        if (version === generation.current)
          setWindow((previous) => ({ ...previous, key, loading: false, failed: true }));
      } finally {
        if (version === generation.current) busy.current = false;
      }
    },
    [key, conversation, read],
  );
  useEffect(() => {
    setMissing(null);
    if (allowed) void load();
    return () => {
      generation.current++;
      busy.current = false;
    };
  }, [allowed, load]);
  const messages = useMemo(() => {
    if (!allowed) return [];
    const local = window.key === key ? window.messages : [];
    if (window.key === key && window.older) return local;
    return [
      ...new Map(
        [...local, ...recent, ...(latest ? [latest] : [])]
          .filter((message) => messageConversation(message, owner) === conversation)
          .map((message) => [message.id, message]),
      ).values(),
    ]
      .sort((a, b) => a.order.localeCompare(b.order) || a.id.localeCompare(b.id))
      .slice(-512);
  }, [allowed, window, key, recent, latest, owner, conversation]);
  visible.current = messages;
  const awaitingTarget = Boolean(
    allowed && target && target !== missing && !messages.some((message) => message.id === target),
  );
  useEffect(() => {
    if (awaitingTarget && !window.loading && !busy.current && !window.failed)
      void load(undefined, target ?? undefined);
  }, [awaitingTarget, target, load, window.loading, window.failed]);
  const last = messages.at(-1);
  return {
    messages,
    awaitingTarget,
    loading: window.key === key && window.loading,
    failed: window.key === key && window.failed,
    hasMore: window.key === key && window.hasMore,
    hasNewer:
      window.key === key &&
      window.older &&
      (window.hasNewer || Boolean(latest && last && last.order < latest.order)),
    later: () => {
      if (!busy.current) void load(undefined, undefined, messages.at(-1)?.order);
    },
    older: window.key === key && window.older,
    earlier: () => {
      if (!busy.current) void load(messages[0]?.order);
    },
    latest: () => {
      setMissing(null);
      void load();
    },
    retry: () => void load(undefined, target ?? undefined),
  };
}
