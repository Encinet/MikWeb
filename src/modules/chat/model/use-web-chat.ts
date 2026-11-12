'use client';

import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { isStaffRole } from '@/modules/auth/model/auth-access';
import { useAuth } from '@/modules/auth/model/use-auth';
import type { HistoryLease } from '@/modules/chat/lib/chat-history';
import {
  announceHistoryChange,
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
import { deleteChatHistoryDatabase } from '@/modules/chat/lib/chat-history-database';
import { ChatSession } from '@/modules/chat/lib/connection/chat-session';
import type { ChatConnection } from '@/modules/chat/model/chat-connection';
import { isTerminalChatClose } from '@/modules/chat/model/chat-connection';
import type { PendingChatMessage } from '@/modules/chat/model/chat-delivery';
import { acceptChatDelivery, unconfirmedChatDeliveries } from '@/modules/chat/model/chat-delivery';
import type { ChatDestination } from '@/modules/chat/model/chat-destination';
import type { ChatHistoryRecovery } from '@/modules/chat/model/chat-history-compatibility';
import { UnsupportedChatHistoryError } from '@/modules/chat/model/chat-history-compatibility';
import type {
  ChatAccess,
  ChatMessage,
  ChatPresence,
  ChatUserMessage,
} from '@/modules/chat/model/chat-protocol';
import {
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
import type { ChatWorkspaceState } from '@/modules/chat/model/chat-workspace';

const EMPTY_PRESENCE: ChatPresence = { players: [], staffPlayers: [] };

function mergeMessages(existing: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const messages = new Map(existing.map((message) => [message.id, message]));
  for (const message of incoming) messages.set(message.id, message);
  return retainChatHistory(
    [...messages.values()].sort((a, b) => compareCursors(messageCursor(a), messageCursor(b))),
  );
}

type LiveMessageListener = (message: ChatUserMessage, access: () => ChatAccess | null) => void;

export function useWebChat() {
  const { account, verified, refresh } = useAuth();
  const owner = account?.playerUuid ?? null;
  const accountStaff = isStaffRole(account?.role);
  const [connection, setConnection] = useState<ChatConnection>({ status: 'idle' });
  const [hasConnected, setHasConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [presence, setPresence] = useState<ChatPresence>(EMPTY_PRESENCE);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [readPositions, setReadPositions] = useState<ChatReadPositions>(new Map());
  const [historyEpoch, setHistoryEpoch] = useState('');
  const [historyLease, setHistoryLease] = useState<HistoryLease | null>(null);
  const [pending, setPending] = useState<PendingChatMessage[]>([]);
  const [staff, setStaff] = useState(accountStaff);
  const [persist, setPersist] = useState(true);
  const [storageFailed, setStorageFailed] = useState(false);
  const [historyRecovery, setHistoryRecovery] = useState<ChatHistoryRecovery | null>(null);
  const [historyRevision, setHistoryRevision] = useState(0);
  const historyScope = useMemo(
    () => ({ owner, verified, revision: historyRevision }),
    [owner, verified, historyRevision],
  );
  const historyAccess = useRef<'loading' | 'ready' | 'incompatible'>('loading');
  const deletingHistory = useRef(false);
  const session = useRef<ChatSession | null>(null);
  const lease = useRef<HistoryLease | null>(null);
  const reading = useRef<ChatReadPositions>(new Map());
  const historyOwner = useRef<string | null>(null);
  const allowedStaff = useRef(accountStaff);
  const liveMessage = useRef<LiveMessageListener | undefined>(undefined);
  const refreshAccount = useEffectEvent(() => {
    void refresh().catch(() => undefined);
  });
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

  const releaseConnection = useCallback(() => {
    setPresence(EMPTY_PRESENCE);
    setPending((current) =>
      current.map((message) =>
        message.status === 'sending' ? { ...message, status: 'unknown' } : message,
      ),
    );
  }, []);

  const stop = useCallback(() => session.current?.stop(), []);
  const retry = useCallback(() => {
    if (historyAccess.current === 'ready') session.current?.retry();
  }, []);
  const historyError = useCallback((error: unknown, current: () => boolean) => {
    if (!current()) return;
    if (error instanceof UnsupportedChatHistoryError) {
      historyAccess.current = 'incompatible';
      session.current?.stop();
      lease.current = null;
      setHistoryLease(null);
      if (!deletingHistory.current) setHistoryRecovery('required');
    } else setStorageFailed(true);
  }, []);

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
      void setStaffHistoryPermission(owner, staff).catch((error) => historyError(error, current));
    },
    [owner, updateReading, historyError],
  );

  useEffect(() => {
    const recover = () => {
      if (historyAccess.current === 'ready') session.current?.recover();
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

  useEffect(() => {
    const { owner, verified } = historyScope;
    stop();
    historyOwner.current = null;
    lease.current = null;
    setHistoryLease(null);
    setMessages([]);
    updateReading(() => new Map());
    setHistoryEpoch('');
    setHasConnected(false);
    setPending([]);
    setError(null);
    historyAccess.current = 'loading';
    setHistoryRecovery(null);
    setStorageFailed(false);
    allowedStaff.current = false;
    setStaff(false);
    if (!owner || !verified) return;
    historyOwner.current = owner;
    const activeSession = new ChatSession(owner, {
      onConnection: setConnection,
      onDisconnect: releaseConnection,
      onRefreshAccount: refreshAccount,
      onDeliveryTimeout: (requestId) =>
        setPending((existing) =>
          existing.map((item) =>
            item.requestId === requestId && item.status === 'sending'
              ? { ...item, status: 'unknown' }
              : item,
          ),
        ),
      onEvent: (event, current) => {
        switch (event.type) {
          case 'authorized':
            applyPermissions(event.staff, current);
            setHasConnected(true);
            setError(null);
            break;
          case 'permissions':
            applyPermissions(event.staff, current);
            break;
          case 'presence':
            setPresence({
              players: event.players,
              staffPlayers: allowedStaff.current ? event.staffPlayers : [],
            });
            break;
          case 'message': {
            const record = event.message;
            if (!isPassiveMessage(record))
              updateReading((positions) =>
                advanceReadPosition(positions, messageConversation(record, owner), null),
              );
            setMessages((existing) => mergeMessages(existing, [record]));
            if (record.kind === 'user')
              liveMessage.current?.(record, () =>
                current() ? activeSession.accessFor(record) : null,
              );
            if (record.kind === 'user' && record.sender.playerUuid === owner)
              setPending((existing) => unconfirmedChatDeliveries(existing, [record], owner));
            const history = lease.current;
            if (history)
              void saveHistory(history, record).catch((error) => historyError(error, current));
            break;
          }
          case 'accepted':
            setPending((existing) =>
              acceptChatDelivery(existing, event.requestId, event.messageId),
            );
            break;
          case 'error':
            setPending((existing) =>
              existing.map((item) =>
                item.requestId === event.requestId
                  ? { ...item, status: 'failed', error: event.error }
                  : item,
              ),
            );
            if (!event.requestId) setError(event.error);
            break;
          case 'closed':
            if (isTerminalChatClose(event.reason)) {
              setMessages([]);
              updateReading(() => new Map());
              setPending([]);
              lease.current = null;
              setHistoryLease(null);
              void syncHistoryAccount(null, current).catch(() => undefined);
              refreshAccount();
            }
            break;
        }
      },
    });
    session.current = activeSession;
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
        setHistoryLease(next);
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
        setPending((existing) => unconfirmedChatDeliveries(existing, snapshot.messages, owner));
        updateReading((positions) => {
          let merged = positions;
          for (const [key, cursor] of snapshot.readPositions) {
            if (key !== 'staff' || allowedStaff.current)
              merged = advanceReadPosition(merged, key, cursor);
          }
          return merged;
        });
      } catch (error) {
        historyError(error, () => current);
      } finally {
        // Ordinary storage failures permit memory-only chat; incompatible data requires consent.
        if (initialize && current && historyAccess.current !== 'incompatible') {
          historyAccess.current = 'ready';
          retry();
        }
      }
    };
    void load(true);
    const unsubscribe = onHistoryChange((reading) => {
      if (!reading) {
        if (deletingHistory.current) return;
        if (historyAccess.current === 'incompatible') setHistoryRevision((value) => value + 1);
        else void load(false);
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
      activeSession.stop();
      if (session.current === activeSession) session.current = null;
    };
  }, [historyScope, retry, stop, updateReading, applyPermissions, releaseConnection, historyError]);

  const deleteUnsupportedHistory = useCallback(async () => {
    if (
      !owner ||
      historyOwner.current !== owner ||
      historyAccess.current !== 'incompatible' ||
      deletingHistory.current
    )
      return;
    const activeSession = session.current;
    const current = () => historyOwner.current === owner && session.current === activeSession;
    deletingHistory.current = true;
    setHistoryRecovery('deleting');
    try {
      await deleteChatHistoryDatabase(() => {
        if (current()) setHistoryRecovery('blocked');
      });
      if (current()) setHistoryRevision((value) => value + 1);
      announceHistoryChange();
    } catch {
      if (current()) setHistoryRecovery('failed');
    } finally {
      deletingHistory.current = false;
    }
  }, [owner]);

  useEffect(() => {
    let current = true;
    // Account metadata initializes history access; an active connection owns its live permissions.
    if (owner && verified && !session.current?.hasConnection)
      applyPermissions(accountStaff, () => current && !session.current?.hasConnection);
    return () => {
      current = false;
    };
  }, [owner, verified, accountStaff, applyPermissions]);

  const send = useCallback((destination: ChatDestination, text: string): boolean => {
    if (historyAccess.current !== 'ready') return false;
    const result = session.current?.send(destination, text);
    if (!result?.ok) {
      if (result?.error) setError(result.error);
      return false;
    }
    setPending((existing) => [
      ...existing.slice(-19),
      {
        requestId: result.requestId,
        destination,
        text: result.text,
        createdAt: Date.now(),
        status: 'sending',
      },
    ]);
    return true;
  }, []);

  const applyHistoryLease = useCallback(
    (next: HistoryLease | null, clear: boolean) => {
      if (!next || next.owner !== historyOwner.current) return;
      lease.current = next;
      setHistoryLease(next);
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
    } catch (error) {
      historyError(error, () => historyOwner.current === owner);
    }
  }, [owner, applyHistoryLease, historyError]);

  const setPersistence = useCallback(
    async (enabled: boolean, workspace?: ChatWorkspaceState) => {
      if (!owner) return;
      try {
        const next = enabled
          ? await enableHistory(owner, messages, reading.current, workspace)
          : await resetHistory(owner, false);
        applyHistoryLease(next, !enabled);
      } catch (error) {
        historyError(error, () => historyOwner.current === owner);
      }
    },
    [owner, messages, applyHistoryLease, historyError],
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
        void saveReadPosition(history, conversation, cursor).catch((error) =>
          historyError(error, () => lease.current === history),
        );
    },
    [owner, updateReading, historyError],
  );
  const unread = useMemo(
    () => (owner ? unreadMessages(messages, owner, readPositions) : new Map<string, ChatUnread>()),
    [messages, owner, readPositions],
  );

  return {
    connection,
    hasConnected,
    error,
    presence,
    messages,
    historyEpoch,
    historyLease,
    unread,
    markRead,
    pending,
    staff,
    persist,
    storageFailed,
    historyRecovery,
    deleteUnsupportedHistory,
    retry,
    send,
    clearHistory,
    setPersistence,
    dismissPending,
    subscribeMessages,
  };
}
