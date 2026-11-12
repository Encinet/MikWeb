'use client';

import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { isStaffRole } from '@/modules/auth/model/auth-access';
import { useAuth } from '@/modules/auth/model/use-auth';
import type { HistoryCleanup, HistoryLease } from '@/modules/chat/lib/chat-history';
import {
  announceHistoryChange,
  clearHistoryThrough,
  currentHistoryLease,
  enableHistory,
  historyAllowsMessage,
  loadHistory,
  onHistoryChange,
  resetHistory,
  saveHistory,
  saveHistorySync,
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
import type { HistoryChannel, HistorySyncPositions } from '@/modules/chat/model/chat-history-sync';
import { advanceHistorySync } from '@/modules/chat/model/chat-history-sync';
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
  CHAT_READ_POSITION_LIMIT,
  compareCursors,
  messageCursor,
  unreadMessages,
} from '@/modules/chat/model/chat-reading';
import type { ChatWorkspaceState } from '@/modules/chat/model/chat-workspace';

const EMPTY_PRESENCE: ChatPresence = { players: [], staffPlayers: [] };

function mergeMessages(
  existing: ChatMessage[],
  incoming: ChatMessage[],
  history: HistoryLease | null,
): ChatMessage[] {
  const messages = new Map(existing.map((message) => [message.id, message]));
  for (const message of incoming) messages.set(message.id, message);
  return [...messages.values()]
    .filter((message) => historyAllowsMessage(history, message))
    .sort((a, b) => compareCursors(messageCursor(a), messageCursor(b)));
}

interface ServerHistoryState {
  loading: boolean;
  failed: boolean;
  count: number;
  backfilling: boolean;
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
  const [serverHistory, setServerHistory] = useState<Record<string, ServerHistoryState>>({});
  const serverPages = useRef<Record<string, ServerHistoryState>>({});
  const serverGeneration = useRef(0);
  const historicalIds = useRef(new Set<string>());
  const liveIds = useRef(new Set<string>());
  const syncPositions = useRef<HistorySyncPositions>({});
  const syncStorageFailed = useRef(false);
  const displayedIds = useRef(new Set<string>());
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
  displayedIds.current = new Set(messages.map((message) => message.id));
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
    if (!owner || reading.current.size <= CHAT_READ_POSITION_LIMIT) return;
    const retained = new Set(messages.map((message) => messageConversation(message, owner)));
    updateReading((positions) => {
      const next = new Map([...positions].filter(([key]) => retained.has(key)));
      return next.size === positions.size ? positions : next;
    });
  }, [messages, owner, updateReading]);

  const releaseConnection = useCallback(() => {
    serverGeneration.current++;
    serverPages.current = {};
    setServerHistory({});
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

  const loadServerHistory = useCallback(
    async (channel: HistoryChannel) => {
      const activeSession = session.current;
      if (!activeSession?.hasHistory || serverPages.current[channel]?.loading) return;
      const generation = serverGeneration.current;
      const epoch = lease.current?.epoch;
      const current = () =>
        generation === serverGeneration.current &&
        session.current === activeSession &&
        lease.current?.epoch === epoch &&
        (channel !== 'staff' || allowedStaff.current);
      let position = syncPositions.current[channel];
      let expected = position;
      let count = 0;
      const backfilling = !position || Boolean(position.head);
      const update = (loading: boolean, failed = false) => {
        serverPages.current = {
          ...serverPages.current,
          [channel]: { loading, failed, count, backfilling },
        };
        setServerHistory(serverPages.current);
      };
      update(true);
      try {
        if (channel === 'staff' && lease.current?.owner)
          await setStaffHistoryPermission(lease.current.owner, allowedStaff.current);
        if (!current()) return;
        for (;;) {
          const page = await activeSession.readHistory({
            channel,
            after: position?.after ?? '0',
            ...(position?.before ? { before: position.before } : {}),
          });
          if (!current()) return;
          const next = advanceHistorySync(position, page);
          if (!next) {
            position = undefined;
            continue;
          }
          const records = page.messages.filter(
            (message) =>
              activeSession.accessFor(message) && historyAllowsMessage(lease.current, message),
          );
          for (const message of records) {
            if (!displayedIds.current.has(message.id) && !liveIds.current.has(message.id))
              historicalIds.current.add(message.id);
            displayedIds.current.add(message.id);
          }
          setMessages((existing) => mergeMessages(existing, records, lease.current));
          const history = lease.current;
          if (history?.persist && !syncStorageFailed.current) {
            try {
              const saved = await saveHistorySync(
                history,
                channel,
                records,
                expected,
                next,
                historicalIds.current,
              );
              if (!current()) return;
              if (saved === 'stale') {
                update(false);
                announceHistoryChange();
                return;
              }
              if (saved === 'forbidden') {
                update(false, true);
                return;
              }
              if (saved === 'conflict') {
                const snapshot = await loadHistory(history);
                if (!current()) return;
                for (const id of snapshot.historicalIds)
                  if (!liveIds.current.has(id)) historicalIds.current.add(id);
                setMessages((existing) =>
                  mergeMessages(
                    existing,
                    snapshot.messages.filter((message) => activeSession.accessFor(message)),
                    lease.current,
                  ),
                );
                position = snapshot.syncPositions[channel];
                expected = position;
                continue;
              }
              expected = next;
            } catch (error) {
              if (!current()) return;
              syncStorageFailed.current = true;
              historyError(error, current);
              if (!current()) return;
            }
          }
          position = next;
          syncPositions.current[channel] = next;
          count += records.length;
          update(true);
          if (!page.hasMore) {
            // A resumed pass may have ended at an older frozen head; immediately catch up to this response's head.
            if (BigInt(page.head) > BigInt(next.after)) continue;
            update(false);
            return;
          }
        }
      } catch {
        if (current()) update(false, true);
      }
    },
    [historyError],
  );

  const applyPermissions = useCallback(
    (staff: boolean, current: () => boolean) => {
      if (!current() || !owner) return;
      const gainedStaff = staff && !allowedStaff.current;
      if (!staff) {
        syncPositions.current.staff = undefined;
        delete serverPages.current.staff;
        setServerHistory({ ...serverPages.current });
      }
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
      const history = lease.current;
      void setStaffHistoryPermission(owner, staff)
        .then(async () => {
          if (!gainedStaff || !history || !current() || !allowedStaff.current) return;
          const snapshot = await loadHistory(history);
          if (!current() || !allowedStaff.current || lease.current?.epoch !== history.epoch) return;
          for (const id of snapshot.historicalIds)
            if (!liveIds.current.has(id)) historicalIds.current.add(id);
          setMessages((records) =>
            mergeMessages(
              records,
              snapshot.messages.filter((message) => message.channel === 'staff'),
              lease.current,
            ),
          );
        })
        .catch((error) => historyError(error, current));
    },
    [owner, updateReading, historyError],
  );

  useEffect(() => {
    if (connection.status !== 'online') return;
    const synchronize = () => {
      void loadServerHistory('public');
      void loadServerHistory('private');
      if (staff) void loadServerHistory('staff');
    };
    synchronize();
    const timer = setInterval(synchronize, 30_000);
    return () => clearInterval(timer);
  }, [connection.status, staff, loadServerHistory]);

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
    serverGeneration.current++;
    serverPages.current = {};
    setServerHistory({});
    historicalIds.current.clear();
    liveIds.current.clear();
    syncPositions.current = {};
    syncStorageFailed.current = false;
    displayedIds.current.clear();
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
            void loadServerHistory('public');
            void loadServerHistory('private');
            if (event.staff) void loadServerHistory('staff');
            break;
          case 'permissions':
            applyPermissions(event.staff, current);
            if (event.staff) void loadServerHistory('staff');
            break;
          case 'presence':
            setPresence({
              players: event.players,
              staffPlayers: allowedStaff.current ? event.staffPlayers : [],
            });
            break;
          case 'message': {
            const record = event.message;
            if (!historyAllowsMessage(lease.current, record)) break;
            historicalIds.current.delete(record.id);
            liveIds.current.add(record.id);
            displayedIds.current.add(record.id);
            if (!isPassiveMessage(record))
              updateReading((positions) =>
                advanceReadPosition(positions, messageConversation(record, owner), null),
              );
            setMessages((existing) => mergeMessages(existing, [record], lease.current));
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
        const epochChanged = Boolean(lease.current && lease.current.epoch !== next?.epoch);
        if (epochChanged) {
          serverGeneration.current++;
          serverPages.current = {};
          setServerHistory({});
          syncPositions.current = {};
          syncStorageFailed.current = false;
          historicalIds.current.clear();
          liveIds.current.clear();
          displayedIds.current.clear();
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
          mergeMessages(snapshot.messages, existing, next).filter((message) =>
            mayReadMessage(message, owner, allowedStaff.current),
          ),
        );
        for (const message of snapshot.messages) {
          displayedIds.current.add(message.id);
          if (snapshot.historicalIds.has(message.id) && !liveIds.current.has(message.id))
            historicalIds.current.add(message.id);
          else historicalIds.current.delete(message.id);
        }
        for (const channel of ['public', 'private', 'staff'] as const) {
          if (!serverPages.current[channel]?.loading)
            syncPositions.current[channel] = snapshot.syncPositions[channel];
        }
        setPending((existing) => unconfirmedChatDeliveries(existing, snapshot.messages, owner));
        updateReading((positions) => {
          let merged = positions;
          for (const [key, cursor] of snapshot.readPositions) {
            if (key !== 'staff' || allowedStaff.current)
              merged = advanceReadPosition(merged, key, cursor);
          }
          return merged;
        });
        if (epochChanged && !initialize) {
          void loadServerHistory('public');
          void loadServerHistory('private');
          if (allowedStaff.current) void loadServerHistory('staff');
        }
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
  }, [
    historyScope,
    retry,
    stop,
    updateReading,
    applyPermissions,
    releaseConnection,
    historyError,
    loadServerHistory,
  ]);

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
    async (next: HistoryLease | null, clear: boolean) => {
      if (!next?.owner || next.owner !== historyOwner.current) return;
      const owner = next.owner;
      lease.current = next;
      setHistoryLease(next);
      setHistoryEpoch(next.epoch);
      setPersist(next.persist);
      serverGeneration.current++;
      serverPages.current = {};
      setServerHistory({});
      syncPositions.current = {};
      syncStorageFailed.current = false;
      if (clear) {
        historicalIds.current.clear();
        liveIds.current.clear();
        displayedIds.current.clear();
        setMessages([]);
        updateReading(() => new Map());
      }
      const snapshot = await loadHistory(next);
      if (lease.current?.epoch !== next.epoch || historyOwner.current !== next.owner) return;
      syncPositions.current = snapshot.syncPositions;
      for (const id of snapshot.historicalIds) historicalIds.current.add(id);
      setMessages((existing) =>
        mergeMessages(existing, snapshot.messages, next).filter((message) =>
          mayReadMessage(message, owner, allowedStaff.current),
        ),
      );
      updateReading((positions) => {
        let merged = positions;
        for (const [key, cursor] of snapshot.readPositions)
          if (key !== 'staff' || allowedStaff.current)
            merged = advanceReadPosition(merged, key, cursor);
        return merged;
      });
      setStorageFailed(false);
      void loadServerHistory('public');
      void loadServerHistory('private');
      if (allowedStaff.current) void loadServerHistory('staff');
    },
    [updateReading, loadServerHistory],
  );

  const clearHistory = useCallback(async () => {
    if (!owner) return;
    try {
      await applyHistoryLease(await resetHistory(owner), true);
      return true;
    } catch (error) {
      historyError(error, () => historyOwner.current === owner);
      return false;
    }
  }, [owner, applyHistoryLease, historyError]);

  const clearMessages = useCallback(
    async (cleanup: HistoryCleanup) => {
      if (!owner) return false;
      try {
        await applyHistoryLease(await clearHistoryThrough(owner, cleanup), true);
        return true;
      } catch (error) {
        historyError(error, () => historyOwner.current === owner);
        return false;
      }
    },
    [owner, applyHistoryLease, historyError],
  );

  const setPersistence = useCallback(
    async (enabled: boolean, workspace?: ChatWorkspaceState) => {
      if (!owner) return;
      try {
        const next = enabled
          ? await enableHistory(owner, messages, reading.current, workspace, historicalIds.current)
          : await resetHistory(owner, false);
        await applyHistoryLease(next, !enabled);
        return true;
      } catch (error) {
        historyError(error, () => historyOwner.current === owner);
        return false;
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
    () =>
      owner
        ? unreadMessages(
            messages.filter((message) => !historicalIds.current.has(message.id)),
            owner,
            readPositions,
          )
        : new Map<string, ChatUnread>(),
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
    serverHistory,
    loadServerHistory,
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
    clearMessages,
    setPersistence,
    dismissPending,
    subscribeMessages,
  };
}
