'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
  setStaffHistoryPermission,
  syncHistoryAccount,
} from '@/modules/chat/lib/chat-history';
import { ChatTransport } from '@/modules/chat/lib/chat-transport';
import type {
  ChatAccess,
  ChatDestination,
  ChatMessage,
  ChatPresence,
} from '@/modules/chat/model/chat-protocol';
import { chatServerEventSchema, mayReadMessage } from '@/modules/chat/model/chat-protocol';

interface PendingChatMessage {
  requestId: string;
  destination: ChatDestination;
  text: string;
  status: 'sending' | 'unknown' | 'failed';
  error?: string;
}
interface PresenceNotice {
  name: string;
  joined: boolean;
}
type ConnectionStatus = 'idle' | 'connecting' | 'authorizing' | 'online' | 'reconnecting' | 'error';
const EMPTY_PRESENCE: ChatPresence = { players: [], staffPlayers: [] };

function mergeMessages(existing: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const messages = new Map(existing.map((message) => [message.id, message]));
  for (const message of incoming) messages.set(message.id, message);
  return [...messages.values()]
    .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id))
    .slice(-500);
}

type LiveMessageListener = (message: ChatMessage, access: () => ChatAccess | null) => void;

export function useWebChat() {
  const { account, verified, refresh } = useAuth();
  const owner = account?.playerUuid ?? null;
  const accountStaff = isStaffRole(account?.role);
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [presence, setPresence] = useState<ChatPresence>(EMPTY_PRESENCE);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState<PendingChatMessage[]>([]);
  const [notice, setNotice] = useState<PresenceNotice | null>(null);
  const [staff, setStaff] = useState(accountStaff);
  const [persist, setPersist] = useState(true);
  const [storageFailed, setStorageFailed] = useState(false);
  const socket = useRef<ChatTransport | null>(null);
  const generation = useRef(0);
  const wanted = useRef(false);
  const attempt = useRef(0);
  const reconnect = useRef<ReturnType<typeof setTimeout> | null>(null);
  const authorizing = useRef<AbortController | null>(null);
  const lease = useRef<HistoryLease | null>(null);
  const historyOwner = useRef<string | null>(null);
  const allowedStaff = useRef(accountStaff);
  const dialRef = useRef<() => void>(() => undefined);
  const liveMessage = useRef<LiveMessageListener | undefined>(undefined);
  const subscribeMessages = useCallback((listener: LiveMessageListener) => {
    liveMessage.current = listener;
    return () => {
      if (liveMessage.current === listener) liveMessage.current = undefined;
    };
  }, []);

  const stop = useCallback(() => {
    wanted.current = false;
    generation.current++;
    if (reconnect.current) clearTimeout(reconnect.current);
    authorizing.current?.abort();
    authorizing.current = null;
    socket.current?.close(1000);
    socket.current = null;
    setPresence(EMPTY_PRESENCE);
    setNotice(null);
    setPending((current) =>
      current.map((message) =>
        message.status === 'sending' ? { ...message, status: 'unknown' } : message,
      ),
    );
    setStatus('idle');
  }, []);

  const applyPermissions = useCallback(
    (staff: boolean, current: () => boolean) => {
      if (!current() || !owner) return;
      allowedStaff.current = staff;
      setStaff(staff);
      if (!staff) setPresence((current) => ({ ...current, staffPlayers: [] }));
      setMessages((records) => records.filter((record) => mayReadMessage(record, owner, staff)));
      void setStaffHistoryPermission(owner, staff).catch(() => {
        if (current()) setStorageFailed(true);
      });
    },
    [owner],
  );

  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(null), 7000);
    return () => clearTimeout(timeout);
  }, [notice]);

  const dial = useCallback(() => {
    if (!owner || !verified || !wanted.current) return;
    const currentGeneration = ++generation.current;
    authorizing.current?.abort();
    authorizing.current = null;
    setStatus(attempt.current ? 'reconnecting' : 'connecting');
    setError(null);
    let ws: ChatTransport;
    try {
      ws = new ChatTransport();
    } catch {
      setStatus('error');
      setError('connection_failed');
      wanted.current = false;
      return;
    }
    socket.current = ws;
    let connectionId = '';
    let confirmed = false;
    let expires: ReturnType<typeof setTimeout> | null = null;
    const current = () => generation.current === currentGeneration && socket.current === ws;
    const invalidResponse = () => {
      wanted.current = false;
      setError('invalid_response');
      ws.close();
    };
    const expire = (delay: number) => {
      if (expires) clearTimeout(expires);
      expires = setTimeout(() => {
        if (current()) ws.close();
      }, delay);
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
          body: JSON.stringify({ connectionId }),
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!current()) return;
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          setError(payload?.error ?? 'chat_unavailable');
          if ([401, 403, 429].includes(response.status)) {
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
        setStatus('authorizing');
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
          setError('session_changed');
          void refresh().catch(() => undefined);
          return;
        }
        confirmed = true;
        attempt.current = 0;
        applyPermissions(message.staff, current);
        setStatus('online');
        setError(null);
        expire(65_000);
        return;
      }
      if (message.type === 'closed') {
        setError(message.reason);
        if (['session_revoked', 'credentials_changed', 'chat_forbidden'].includes(message.reason)) {
          wanted.current = false;
          setMessages([]);
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
        case 'presence_notice':
          setNotice({ name: message.name, joined: message.joined });
          break;
        case 'message': {
          if (!mayReadMessage(message.message, owner, allowedStaff.current)) {
            invalidResponse();
            return;
          }
          const record = message.message;
          setMessages((existing) => mergeMessages(existing, [record]));
          liveMessage.current?.(record, () =>
            current() &&
            ws.readyState === WebSocket.OPEN &&
            mayReadMessage(record, owner, allowedStaff.current)
              ? { owner, staff: allowedStaff.current }
              : null,
          );
          if (record.senderUuid === owner && record.requestId)
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
      if (expires) clearTimeout(expires);
      if (!current()) return;
      authorizing.current?.abort();
      authorizing.current = null;
      socket.current = null;
      setPresence(EMPTY_PRESENCE);
      setPending((existing) =>
        existing.map((item) => (item.status === 'sending' ? { ...item, status: 'unknown' } : item)),
      );
      if (!wanted.current) {
        setStatus('error');
        return;
      }
      setStatus('reconnecting');
      const delay =
        Math.min(30_000, 1000 * 2 ** Math.min(attempt.current++, 5)) + Math.random() * 750;
      reconnect.current = setTimeout(() => dialRef.current(), delay);
    };
    ws.onerror = () => {
      if (current()) setError('connection_failed');
    };
  }, [owner, verified, refresh, applyPermissions]);

  useEffect(() => {
    dialRef.current = dial;
  }, [dial]);

  const retry = useCallback(() => {
    if (socket.current || !owner || !verified) return;
    if (reconnect.current) clearTimeout(reconnect.current);
    wanted.current = true;
    attempt.current = 0;
    dialRef.current();
  }, [owner, verified]);

  useEffect(() => {
    stop();
    historyOwner.current = null;
    lease.current = null;
    setMessages([]);
    setPending([]);
    setError(null);
    allowedStaff.current = false;
    setStaff(false);
    if (!owner || !verified) return;
    historyOwner.current = owner;
    setStatus('connecting');
    let current = true;
    const load = async (initialize: boolean) => {
      try {
        const next = initialize
          ? await syncHistoryAccount(owner, () => current)
          : await currentHistoryLease(owner);
        if (!current) return;
        if (lease.current && lease.current.epoch !== next?.epoch) setMessages([]);
        lease.current = next;
        if (!next) {
          stop();
          setMessages([]);
          return;
        }
        setPersist(next.persist);
        const records = await loadHistory(next);
        if (!current || lease.current?.epoch !== next.epoch) return;
        setMessages((existing) =>
          mergeMessages(records, existing).filter((message) =>
            mayReadMessage(message, owner, allowedStaff.current),
          ),
        );
      } catch {
        if (current) setStorageFailed(true);
      } finally {
        // History initialization cannot overwrite live traffic; unavailable storage still permits chat.
        if (initialize && current) retry();
      }
    };
    void load(true);
    const unsubscribe = onHistoryChange(() => {
      void load(false);
    });
    return () => {
      current = false;
      unsubscribe();
      historyOwner.current = null;
      lease.current = null;
      stop();
    };
  }, [owner, verified, retry, stop]);

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
      if (!ws || ws.readyState !== WebSocket.OPEN || status !== 'online' || !value) return false;
      if (
        [...value].length > 1000 ||
        new TextEncoder().encode(value).length > 4096 ||
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
        setError('connection_failed');
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

  const applyHistoryLease = useCallback((next: HistoryLease | null, clear: boolean) => {
    if (!next || next.owner !== historyOwner.current) return;
    lease.current = next;
    setPersist(next.persist);
    if (clear) setMessages([]);
    setStorageFailed(false);
  }, []);

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
          ? await enableHistory(owner, messages)
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

  return {
    status,
    error,
    presence,
    messages,
    pending,
    notice,
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
