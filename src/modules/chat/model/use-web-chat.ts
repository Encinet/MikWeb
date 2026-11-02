'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isStaffRole } from '@/modules/auth/model/auth-types';
import { useAuth } from '@/modules/auth/model/use-auth';
import type { HistoryLease } from '@/modules/chat/lib/chat-history';
import {
  currentHistoryLease,
  enableHistory,
  loadHistory,
  onHistoryChange,
  resetHistory,
  saveHistory,
  saveReadPosition,
  setStaffHistoryPermission,
  syncHistoryAccount,
} from '@/modules/chat/lib/chat-history';
import { ChatTransport } from '@/modules/chat/lib/chat-transport';
import type { ChatDestination } from '@/modules/chat/model/chat-destination';
import type {
  ChatAccess,
  ChatMessage,
  ChatPlayerMessage,
  ChatPresence,
} from '@/modules/chat/model/chat-protocol';
import {
  CHAT_MESSAGE_MAX_LENGTH,
  chatServerEventSchema,
  isPassiveMessage,
  mayReadMessage,
  messageConversation,
} from '@/modules/chat/model/chat-protocol';
import type {
  ChatReadCursor,
  ChatReadPositions,
  ChatUnread,
} from '@/modules/chat/model/chat-reading';
import {
  advanceReadPosition,
  CHAT_HISTORY_LIMIT,
  compareCursors,
  messageCursor,
  retainChatHistory,
  unreadMessages,
} from '@/modules/chat/model/chat-reading';

export interface PendingChatMessage {
  requestId: string;
  destination: ChatDestination;
  text: string;
  status: 'sending' | 'unknown' | 'failed';
  error?: string;
}
type ChatConnection =
  | { status: 'idle' | 'connecting' | 'authorizing' | 'online'; error?: never }
  | { status: 'reconnecting'; error?: string }
  | { status: 'error'; error: string };
const EMPTY_PRESENCE: ChatPresence = { players: [], staffPlayers: [] };

function mergeMessages(existing: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const messages = new Map(existing.map((message) => [message.id, message]));
  for (const message of incoming) messages.set(message.id, message);
  return retainChatHistory(
    [...messages.values()].sort((a, b) => compareCursors(messageCursor(a), messageCursor(b))),
  );
}

type LiveMessageListener = (message: ChatPlayerMessage, access: () => ChatAccess | null) => void;

export function useWebChat() {
  const { account, verified, refresh } = useAuth();
  const owner = account?.playerUuid ?? null;
  const accountStaff = isStaffRole(account?.role);
  const [connection, setConnection] = useState<ChatConnection>({ status: 'idle' });
  const status = connection.status;
  const [error, setError] = useState<string | null>(null);
  const [presence, setPresence] = useState<ChatPresence>(EMPTY_PRESENCE);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [readPositions, setReadPositions] = useState<ChatReadPositions>(new Map());
  const [historyEpoch, setHistoryEpoch] = useState('');
  const [pending, setPending] = useState<PendingChatMessage[]>([]);
  const [staff, setStaff] = useState(accountStaff);
  const [persist, setPersist] = useState(true);
  const [storageFailed, setStorageFailed] = useState(false);
  const socket = useRef<ChatTransport | null>(null);
  const authorizationExpiry = useRef<{
    at: number;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);
  const generation = useRef(0);
  const wanted = useRef(false);
  const attempt = useRef(0);
  const reconnect = useRef<ReturnType<typeof setTimeout> | null>(null);
  const authorizing = useRef<AbortController | null>(null);
  const lease = useRef<HistoryLease | null>(null);
  const reading = useRef<ChatReadPositions>(new Map());
  const historyOwner = useRef<string | null>(null);
  const allowedStaff = useRef(accountStaff);
  const dialRef = useRef<() => void>(() => undefined);
  const liveMessage = useRef<LiveMessageListener | undefined>(undefined);
  const updateReading = useCallback(
    (update: (previous: ChatReadPositions) => ChatReadPositions) => {
      const next = update(reading.current);
      if (next === reading.current) return;
      reading.current = next;
      setReadPositions(next);
    },
    [],
  );
  const subscribeMessages = useCallback((listener: LiveMessageListener) => {
    liveMessage.current = listener;
    return () => {
      if (liveMessage.current === listener) liveMessage.current = undefined;
    };
  }, []);

  useEffect(() => {
    if (!owner || reading.current.size <= CHAT_HISTORY_LIMIT) return;
    const retained = new Set(messages.map((message) => messageConversation(message, owner)));
    updateReading((positions) => {
      const next = new Map([...positions].filter(([key]) => retained.has(key)));
      return next.size === positions.size ? positions : next;
    });
  }, [messages, owner, updateReading]);

  const releaseSocket = useCallback(() => {
    const previous = socket.current;
    socket.current = null;
    if (authorizationExpiry.current) clearTimeout(authorizationExpiry.current.timer);
    authorizationExpiry.current = null;
    previous?.close();
    setPresence(EMPTY_PRESENCE);
    setPending((current) =>
      current.map((message) =>
        message.status === 'sending' ? { ...message, status: 'unknown' } : message,
      ),
    );
  }, []);

  const stop = useCallback(() => {
    wanted.current = false;
    generation.current++;
    if (reconnect.current) clearTimeout(reconnect.current);
    reconnect.current = null;
    authorizing.current?.abort();
    authorizing.current = null;
    releaseSocket();
    setConnection({ status: 'idle' });
  }, [releaseSocket]);

  const applyPermissions = useCallback(
    (staff: boolean, current: () => boolean) => {
      if (!current() || !owner) return;
      allowedStaff.current = staff;
      setStaff(staff);
      if (!staff) setPresence((current) => ({ ...current, staffPlayers: [] }));
      if (!staff)
        updateReading((positions) => {
          if (!positions.has('staff')) return positions;
          const next = new Map(positions);
          next.delete('staff');
          return next;
        });
      setMessages((records) => records.filter((record) => mayReadMessage(record, owner, staff)));
      void setStaffHistoryPermission(owner, staff).catch(() => {
        if (current()) setStorageFailed(true);
      });
    },
    [owner, updateReading],
  );

  const dial = useCallback(() => {
    if (!owner || !verified || !wanted.current) return;
    const currentGeneration = ++generation.current;
    const previous = socket.current;
    if (reconnect.current) clearTimeout(reconnect.current);
    reconnect.current = null;
    authorizing.current?.abort();
    authorizing.current = null;
    releaseSocket();
    setConnection({ status: previous || attempt.current ? 'reconnecting' : 'connecting' });
    setError(null);
    let ws: ChatTransport;
    try {
      ws = new ChatTransport();
    } catch {
      setConnection({ status: 'error', error: 'connection_failed' });
      wanted.current = false;
      return;
    }
    socket.current = ws;
    let connectionId = '';
    let confirmed = false;
    const current = () => generation.current === currentGeneration && socket.current === ws;
    const invalidResponse = () => {
      wanted.current = false;
      setConnection({ status: 'error', error: 'invalid_response' });
      ws.close();
    };
    const expire = (delay: number) => {
      if (authorizationExpiry.current) clearTimeout(authorizationExpiry.current.timer);
      authorizationExpiry.current = {
        at: Date.now() + delay,
        timer: setTimeout(() => {
          if (current()) ws.close();
        }, delay),
      };
    };
    const authorize = async () => {
      if (!connectionId || !current() || authorizing.current) return;
      const controller = new AbortController();
      authorizing.current = controller;
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch('/api/account/chat/authorize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ connectionId, clientPublicKey: ws.authorizationKey }),
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!current()) return;
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          const reason = typeof payload?.error === 'string' ? payload.error : 'chat_unavailable';
          const terminal = [401, 403, 429].includes(response.status);
          setConnection({ status: terminal ? 'error' : 'reconnecting', error: reason });
          if (terminal) {
            wanted.current = false;
            if (response.status === 401 || response.status === 403)
              void refresh().catch(() => undefined);
          }
          ws.close();
        }
      } catch {
        if (current() && !confirmed) ws.close();
      } finally {
        clearTimeout(timeout);
        if (authorizing.current === controller) authorizing.current = null;
      }
    };
    expire(16_000);
    ws.onmessage = (event: MessageEvent<unknown>) => {
      if (!current()) return;
      if (typeof event.data !== 'string' || event.data.length > 128 * 1024) {
        invalidResponse();
        return;
      }
      let input: unknown;
      try {
        input = JSON.parse(event.data);
      } catch {
        invalidResponse();
        return;
      }
      const parsed = chatServerEventSchema.safeParse(input);
      if (!parsed.success) {
        invalidResponse();
        return;
      }
      const message = parsed.data;
      if (message.type === 'hello') {
        if (connectionId) {
          invalidResponse();
          return;
        }
        connectionId = message.connectionId;
        setConnection({ status: 'authorizing' });
        void authorize();
        return;
      }
      if (message.type === 'authorized') {
        if (!connectionId) {
          invalidResponse();
          return;
        }
        if (message.playerUuid !== owner) {
          wanted.current = false;
          ws.close();
          setConnection({ status: 'error', error: 'session_changed' });
          void refresh().catch(() => undefined);
          return;
        }
        confirmed = true;
        attempt.current = 0;
        applyPermissions(message.staff, current);
        setConnection({ status: 'online' });
        setError(null);
        expire(65_000);
        return;
      }
      if (message.type === 'closed') {
        const terminal = ['session_revoked', 'credentials_changed', 'chat_forbidden'].includes(
          message.reason,
        );
        setConnection({ status: terminal ? 'error' : 'reconnecting', error: message.reason });
        if (terminal) {
          wanted.current = false;
          setMessages([]);
          updateReading(() => new Map());
          setPending([]);
          lease.current = null;
          void syncHistoryAccount(null, () => generation.current === currentGeneration).catch(
            () => undefined,
          );
          void refresh().catch(() => undefined);
        }
        ws.close();
        return;
      }
      if (!confirmed) {
        invalidResponse();
        return;
      }
      switch (message.type) {
        case 'reauthorize':
          void authorize();
          break;
        case 'permissions': {
          applyPermissions(message.staff, current);
          break;
        }
        case 'presence':
          setPresence({
            players: message.players,
            staffPlayers: allowedStaff.current ? message.staffPlayers : [],
          });
          break;
        case 'message': {
          if (!mayReadMessage(message.message, owner, allowedStaff.current)) {
            invalidResponse();
            return;
          }
          const record = message.message;
          if (!isPassiveMessage(record))
            updateReading((positions) =>
              advanceReadPosition(positions, messageConversation(record, owner), null),
            );
          setMessages((existing) => mergeMessages(existing, [record]));
          if (record.kind === 'player')
            liveMessage.current?.(record, () =>
              current() &&
              ws.readyState === WebSocket.OPEN &&
              mayReadMessage(record, owner, allowedStaff.current)
                ? { owner, staff: allowedStaff.current }
                : null,
            );
          if (record.kind === 'player' && record.senderUuid === owner && record.requestId)
            setPending((existing) =>
              existing.filter((item) => item.requestId !== record.requestId),
            );
          const history = lease.current;
          if (history)
            void saveHistory(history, record).catch(() => {
              if (current()) setStorageFailed(true);
            });
          break;
        }
        case 'accepted':
          setPending((existing) => existing.filter((item) => item.requestId !== message.requestId));
          break;
        case 'error': {
          setPending((existing) =>
            existing.map((item) =>
              item.requestId === message.requestId
                ? { ...item, status: 'failed', error: message.error }
                : item,
            ),
          );
          if (!message.requestId) setError(message.error);
          break;
        }
      }
    };
    ws.onclose = () => {
      if (!current()) return;
      authorizing.current?.abort();
      authorizing.current = null;
      releaseSocket();
      if (!wanted.current) {
        setConnection((current) => ({
          status: 'error',
          error: current.error ?? 'connection_failed',
        }));
        return;
      }
      setConnection((current) => ({ status: 'reconnecting', error: current.error }));
      const delay =
        Math.min(30_000, 1000 * 2 ** Math.min(attempt.current++, 5)) + Math.random() * 750;
      reconnect.current = setTimeout(() => dialRef.current(), delay);
    };
    ws.onerror = (failure) => {
      if (!current() || !wanted.current) return;
      if (failure === 'protocol') {
        wanted.current = false;
        setConnection({ status: 'error', error: 'invalid_response' });
      } else setConnection({ status: 'reconnecting', error: 'connection_failed' });
    };
  }, [owner, verified, refresh, applyPermissions, updateReading, releaseSocket]);

  useEffect(() => {
    dialRef.current = dial;
  }, [dial]);

  useEffect(() => {
    const recover = () => {
      if (!wanted.current) return;
      const ws = socket.current;
      if (
        ws &&
        (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) &&
        Date.now() < (authorizationExpiry.current?.at ?? 0)
      )
        return;
      dialRef.current();
    };
    const visible = () => {
      if (document.visibilityState === 'visible') recover();
    };
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('pageshow', visible);
    window.addEventListener('focus', visible);
    window.addEventListener('online', recover);
    return () => {
      document.removeEventListener('visibilitychange', visible);
      window.removeEventListener('pageshow', visible);
      window.removeEventListener('focus', visible);
      window.removeEventListener('online', recover);
    };
  }, []);

  const retry = useCallback(() => {
    if (!owner || !verified || (socket.current && wanted.current)) return;
    wanted.current = true;
    attempt.current = 0;
    dialRef.current();
  }, [owner, verified]);

  useEffect(() => {
    stop();
    historyOwner.current = null;
    lease.current = null;
    setMessages([]);
    updateReading(() => new Map());
    setHistoryEpoch('');
    setPending([]);
    setError(null);
    allowedStaff.current = false;
    setStaff(false);
    if (!owner || !verified) return;
    historyOwner.current = owner;
    setConnection({ status: 'connecting' });
    let current = true;
    const load = async (initialize: boolean) => {
      try {
        const next = initialize
          ? await syncHistoryAccount(owner, () => current)
          : await currentHistoryLease(owner);
        if (!current) return;
        if (lease.current && lease.current.epoch !== next?.epoch) {
          setMessages([]);
          updateReading(() => new Map());
        }
        lease.current = next;
        setHistoryEpoch(next?.epoch ?? '');
        if (!next) {
          stop();
          setMessages([]);
          updateReading(() => new Map());
          return;
        }
        setPersist(next.persist);
        const snapshot = await loadHistory(next);
        if (!current || lease.current?.epoch !== next.epoch) return;
        setMessages((existing) =>
          mergeMessages(snapshot.messages, existing).filter((message) =>
            mayReadMessage(message, owner, allowedStaff.current),
          ),
        );
        updateReading((positions) => {
          let merged = positions;
          for (const [key, cursor] of snapshot.readPositions) {
            if (key !== 'staff' || allowedStaff.current)
              merged = advanceReadPosition(merged, key, cursor);
          }
          return merged;
        });
      } catch {
        if (current) setStorageFailed(true);
      } finally {
        // History initialization cannot overwrite live traffic; unavailable storage still permits chat.
        if (initialize && current) retry();
      }
    };
    void load(true);
    const unsubscribe = onHistoryChange((reading) => {
      if (!reading) {
        void load(false);
        return;
      }
      if (
        reading.owner === owner &&
        reading.epoch === lease.current?.epoch &&
        (reading.conversation !== 'staff' || allowedStaff.current)
      ) {
        updateReading((positions) =>
          advanceReadPosition(positions, reading.conversation, reading.cursor),
        );
      }
    });
    return () => {
      current = false;
      unsubscribe();
      historyOwner.current = null;
      lease.current = null;
      stop();
    };
  }, [owner, verified, retry, stop, updateReading]);

  useEffect(() => {
    let current = true;
    // Account metadata initializes history access; an active connection owns its live permissions.
    if (owner && verified && !socket.current)
      applyPermissions(accountStaff, () => current && !socket.current);
    return () => {
      current = false;
    };
  }, [owner, verified, accountStaff, applyPermissions]);

  const send = useCallback(
    (destination: ChatDestination, text: string): boolean => {
      const ws = socket.current;
      const value = text.trim();
      if (
        !wanted.current ||
        !ws ||
        ws.readyState !== WebSocket.OPEN ||
        status !== 'online' ||
        !value
      )
        return false;
      if (
        [...value].length > CHAT_MESSAGE_MAX_LENGTH ||
        [...value].some((character) => {
          const code = character.codePointAt(0) ?? 0;
          return code <= 31 || (code >= 127 && code <= 159) || code === 0x2028 || code === 0x2029;
        })
      ) {
        setError('invalid_message');
        return false;
      }
      if (destination.channel === 'staff' && !allowedStaff.current) {
        setError('staff_required');
        return false;
      }
      if (
        destination.channel === 'private' &&
        !presence.players.some((player) => player.playerUuid === destination.targetUuid)
      ) {
        setError('recipient_unavailable');
        return false;
      }
      if (ws.bufferedAmount > 16 * 1024) {
        setError('chat_busy');
        return false;
      }
      const requestId = crypto.randomUUID();
      const body = {
        type: 'send',
        requestId,
        channel: destination.channel,
        text: value,
        ...(destination.channel === 'private' ? { targetUuid: destination.targetUuid } : {}),
      };
      try {
        ws.send(JSON.stringify(body));
      } catch {
        setConnection({ status: 'reconnecting', error: 'connection_failed' });
        ws.close();
        return false;
      }
      setPending((existing) => [
        ...existing.slice(-19),
        { requestId, destination, text: value, status: 'sending' },
      ]);
      const sentGeneration = generation.current;
      setTimeout(() => {
        if (generation.current !== sentGeneration) return;
        setPending((existing) =>
          existing.map((item) =>
            item.requestId === requestId && item.status === 'sending'
              ? { ...item, status: 'unknown' }
              : item,
          ),
        );
      }, 10_000);
      return true;
    },
    [presence.players, status],
  );

  const applyHistoryLease = useCallback(
    (next: HistoryLease | null, clear: boolean) => {
      if (!next || next.owner !== historyOwner.current) return;
      lease.current = next;
      setHistoryEpoch(next.epoch);
      setPersist(next.persist);
      if (clear) {
        setMessages([]);
        updateReading(() => new Map());
      }
      setStorageFailed(false);
    },
    [updateReading],
  );

  const clearHistory = useCallback(async () => {
    if (!owner) return;
    try {
      applyHistoryLease(await resetHistory(owner), true);
    } catch {
      if (historyOwner.current === owner) setStorageFailed(true);
    }
  }, [owner, applyHistoryLease]);

  const setPersistence = useCallback(
    async (enabled: boolean) => {
      if (!owner) return;
      try {
        const next = enabled
          ? await enableHistory(owner, messages, reading.current)
          : await resetHistory(owner, false);
        applyHistoryLease(next, !enabled);
      } catch {
        if (historyOwner.current === owner) setStorageFailed(true);
      }
    },
    [owner, messages, applyHistoryLease],
  );

  const dismissPending = useCallback(
    (requestId: string) =>
      setPending((existing) => existing.filter((item) => item.requestId !== requestId)),
    [],
  );

  const markRead = useCallback(
    (conversation: string, cursor: ChatReadCursor) => {
      if (!owner || (conversation === 'staff' && !allowedStaff.current)) return;
      const next = advanceReadPosition(reading.current, conversation, cursor);
      if (next === reading.current) return;
      updateReading(() => next);
      const history = lease.current;
      if (history)
        void saveReadPosition(history, conversation, cursor).catch(() => {
          if (lease.current === history) setStorageFailed(true);
        });
    },
    [owner, updateReading],
  );
  const unread = useMemo(
    () => (owner ? unreadMessages(messages, owner, readPositions) : new Map<string, ChatUnread>()),
    [messages, owner, readPositions],
  );

  return {
    connection,
    error,
    presence,
    messages,
    historyEpoch,
    unread,
    markRead,
    pending,
    staff,
    persist,
    storageFailed,
    retry,
    send,
    clearHistory,
    setPersistence,
    dismissPending,
    subscribeMessages,
  };
}
