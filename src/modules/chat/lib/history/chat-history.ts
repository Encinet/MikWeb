import { openChatHistoryDatabase as openDatabase } from '@/modules/chat/lib/history/chat-history-database';
import { historyMessagePlayer } from '@/modules/chat/lib/history/chat-history-player';
import type { ChatMessage } from '@/modules/chat/model/chat-protocol';
import {
  chatMessageSchema,
  countsAsUnread,
  isPassiveMessage,
  mayReadMessage,
  messageConversation,
} from '@/modules/chat/model/chat-protocol';
import type { ChatReadCursor, ChatReadPositions } from '@/modules/chat/model/chat-reading';
import {
  advanceReadPosition,
  compareCursors,
  messageCursor,
  readStoredPositions,
} from '@/modules/chat/model/chat-reading';
import type {
  HistoryChannel,
  HistorySyncPosition,
  HistorySyncPositions,
} from '@/modules/chat/model/history/chat-history-sync';
import { readHistorySyncPositions } from '@/modules/chat/model/history/chat-history-sync';
import type {
  ChatWorkspaceMutation,
  ChatWorkspaceState,
} from '@/modules/chat/model/workspace/chat-workspace';
import {
  emptyChatWorkspace,
  readChatWorkspace,
  updateChatWorkspace,
} from '@/modules/chat/model/workspace/chat-workspace';

export interface HistoryLease {
  owner: string | null;
  epoch: string;
  persist: boolean;
  clearedThrough?: Partial<Record<HistoryChannel, number>>;
  clearedPlayersThrough?: Record<string, Partial<Record<HistoryChannel, number>>>;
  workspaceEpoch?: string;
}

/** Message-only cleanup must preserve queued drafts and workspace writes. */
export function chatWorkspaceEpoch(lease: HistoryLease | null): string | null {
  return lease?.workspaceEpoch ?? lease?.epoch ?? null;
}

interface HistoryReadChange {
  owner: string;
  epoch: string;
  conversation: string;
  cursor: ChatReadCursor;
}

const CHANGE_EVENT = 'mik-chat-history-change';

/** Local deletion is independent of the server's retention deadline. */
export function historyAllowsMessage(lease: HistoryLease | null, message: ChatMessage): boolean {
  if (message.createdAt <= (lease?.clearedThrough?.[message.channel] ?? -1)) return false;
  if (!lease?.owner || !lease.clearedPlayersThrough) return true;
  const player = historyMessagePlayer(message, lease.owner);
  return (
    !player ||
    message.createdAt > (lease.clearedPlayersThrough[player.uuid]?.[message.channel] ?? -1)
  );
}

function range(owner: string, through = Number.MAX_SAFE_INTEGER): IDBKeyRange {
  return IDBKeyRange.bound([owner, 0, ''], [owner, through, '\uffff']);
}

function storedMessage(owner: string, message: ChatMessage, historical = false) {
  return {
    key: `${owner}:${message.id}`,
    owner,
    createdAt: message.createdAt,
    order: message.order,
    bucket: isPassiveMessage(message) ? 'activity' : 'conversation',
    channel: message.channel,
    conversation: messageConversation(message, owner),
    unread: !historical && countsAsUnread(message, owner) ? 1 : 0,
    message,
    historical,
  };
}

interface StoredState extends HistoryLease {
  staff: boolean;
  readPositions: ChatReadPositions;
  workspace?: ChatWorkspaceState;
  syncPositions?: HistorySyncPositions;
  latest?: ChatMessage[];
}

function readState(value: unknown): StoredState | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<StoredState>;
  return (typeof candidate.owner === 'string' || candidate.owner === null) &&
    typeof candidate.epoch === 'string' &&
    typeof candidate.persist === 'boolean' &&
    typeof candidate.staff === 'boolean'
    ? {
        ...(candidate as StoredState),
        readPositions: readStoredPositions(candidate.readPositions),
        latest: Array.isArray(candidate.latest)
          ? candidate.latest.flatMap((message) => {
              const parsed = chatMessageSchema.safeParse(message);
              return parsed.success ? [parsed.data] : [];
            })
          : [],
      }
    : null;
}

function transaction<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  action: (state: IDBObjectStore, messages: IDBObjectStore, result: (value: T) => void) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['state', 'messages'], mode);
    let output: T;
    tx.oncomplete = () => resolve(output);
    tx.onerror = () => reject(tx.error ?? new Error('history_unavailable'));
    tx.onabort = () => reject(tx.error ?? new Error('history_unavailable'));
    action(tx.objectStore('state'), tx.objectStore('messages'), (value) => {
      output = value;
    });
  });
}

/** One browser cookie account owns the store. Switching accounts clears the previous owner's data. */
export async function syncHistoryAccount(
  owner: string | null,
  current: () => boolean = () => true,
): Promise<HistoryLease> {
  const db = await openDatabase();
  if (!current()) throw new Error('stale_history_owner');
  return transaction(db, 'readwrite', (state, messages, done) => {
    const request = state.get('current');
    request.onsuccess = () => {
      if (!current()) {
        state.transaction.abort();
        return;
      }
      let lease = readState(request.result);
      if (!lease || lease.owner !== owner) {
        messages.clear();
        lease = {
          owner,
          epoch: crypto.randomUUID(),
          persist: true,
          staff: false,
          readPositions: new Map(),
        };
        state.put(lease, 'current');
      }
      done(lease);
    };
  });
}

export async function currentHistoryLease(owner: string): Promise<HistoryLease | null> {
  const db = await openDatabase();
  return transaction(db, 'readonly', (state, _messages, done) => {
    const request = state.get('current');
    request.onsuccess = () => {
      const lease = readState(request.result);
      done(lease?.owner === owner ? lease : null);
    };
  });
}

export async function resetHistory(owner: string, persist?: false): Promise<HistoryLease | null> {
  const db = await openDatabase();
  const lease = await transaction<HistoryLease | null>(db, 'readwrite', (state, messages, done) => {
    const request = state.get('current');
    request.onsuccess = () => {
      const previous = readState(request.result);
      if (previous?.owner !== owner) {
        done(null);
        return;
      }
      const next = {
        ...previous,
        epoch: crypto.randomUUID(),
        syncPositions: {},
        latest: [],
        workspaceEpoch: crypto.randomUUID(),
        clearedThrough:
          persist === false
            ? previous.clearedThrough
            : Object.fromEntries(
                (['public', 'private', 'staff'] as const).map((channel) => [
                  channel,
                  Math.max(previous.clearedThrough?.[channel] ?? -1, Date.now()),
                ]),
              ),
        persist: persist ?? previous.persist,
        readPositions: new Map(),
        workspace: emptyChatWorkspace(
          readChatWorkspace(previous.workspace, previous.staff).preferences,
        ),
      };
      state.put(next, 'current');
      messages.clear();
      done(next);
    };
  });
  announceHistoryChange();
  return lease;
}

export async function enableHistory(
  owner: string,
  records: ChatMessage[],
  readPositions: ChatReadPositions,
  workspace?: ChatWorkspaceState,
  historicalIds: ReadonlySet<string> = new Set(),
): Promise<HistoryLease | null> {
  const db = await openDatabase();
  const lease = await transaction<HistoryLease | null>(db, 'readwrite', (state, messages, done) => {
    const request = state.get('current');
    request.onsuccess = () => {
      const previous = readState(request.result);
      if (previous?.owner !== owner) {
        done(null);
        return;
      }
      const next = {
        ...previous,
        persist: true,
        latest: trackLatest(previous, records),
        readPositions: new Map(readPositions),
        workspace: readChatWorkspace(workspace ?? previous.workspace, previous.staff),
      };
      if (!next.staff) next.readPositions.delete('staff');
      state.put(next, 'current');
      for (const message of records) {
        if (!historyAllowsMessage(next, message) || !mayReadMessage(message, owner, next.staff))
          continue;
        messages.put(storedMessage(owner, message, historicalIds.has(message.id)));
      }
      done(next);
    };
  });
  announceHistoryChange();
  return lease;
}

export interface HistoryCleanup {
  channel: HistoryChannel | 'all';
  through: number;
  /** An omitted list selects everyone; an empty list is invalid. */
  players?: readonly string[];
}

export function historyMatchesCleanup(
  message: ChatMessage,
  owner: string,
  cleanup: HistoryCleanup,
) {
  if (message.createdAt > cleanup.through) return false;
  if (cleanup.channel !== 'all' && message.channel !== cleanup.channel) return false;
  if (!cleanup.players) return true;
  const player = historyMessagePlayer(message, owner);
  return Boolean(player && cleanup.players.includes(player.uuid));
}

function cleanupRange(owner: string, cleanup: HistoryCleanup): IDBKeyRange {
  return cleanup.channel === 'all'
    ? range(owner, cleanup.through)
    : IDBKeyRange.bound(
        [owner, cleanup.channel, 0, ''],
        [owner, cleanup.channel, cleanup.through, '\uffff'],
      );
}

function cleanupIndex(messages: IDBObjectStore, cleanup: HistoryCleanup): IDBIndex {
  return messages.index(cleanup.channel === 'all' ? 'ownerTime' : 'ownerChannelTime');
}

export interface ChatHistorySummary {
  total: number;
  matching: number;
  oldestAt: number | null;
}

/** Counts use the time index; opening settings never loads every stored message. */
export async function readHistorySummary(
  lease: HistoryLease,
  cleanup: HistoryCleanup,
): Promise<ChatHistorySummary | null> {
  const owner = lease.owner;
  if (!owner) return null;
  const db = await openDatabase();
  return transaction(db, 'readonly', (state, messages, done) => {
    done(null);
    const check = state.get('current');
    check.onsuccess = () => {
      const active = readState(check.result);
      if (active?.owner !== lease.owner || active.epoch !== lease.epoch) return;
      const summary: ChatHistorySummary = { total: 0, matching: 0, oldestAt: null };
      done(summary);
      const index = messages.index('ownerTime');
      const total = index.count(range(owner));
      total.onsuccess = () => {
        summary.total = total.result;
      };
      if (cleanup.players) {
        const matching = cleanupIndex(messages, cleanup).openCursor(cleanupRange(owner, cleanup));
        matching.onsuccess = () => {
          const cursor = matching.result;
          if (!cursor) return;
          if (historyMatchesCleanup(cursor.value.message, owner, cleanup)) summary.matching++;
          cursor.continue();
        };
      } else {
        const matching = cleanupIndex(messages, cleanup).count(cleanupRange(owner, cleanup));
        matching.onsuccess = () => {
          summary.matching = matching.result;
        };
      }
      const oldest = index.openKeyCursor(range(owner));
      oldest.onsuccess = () => {
        if (oldest.result) summary.oldestAt = (oldest.result.key as [string, number, string])[1];
      };
    };
  });
}

/** Atomically delete older messages and invalidate in-flight writes from every tab. */
export async function clearHistoryThrough(
  owner: string,
  cleanup: HistoryCleanup,
): Promise<HistoryLease | null> {
  const { through, channel } = cleanup;
  if (!Number.isSafeInteger(through) || through < 0 || through > Date.now())
    throw new Error('invalid_history_cutoff');
  if (
    !['all', 'public', 'private', 'staff'].includes(channel) ||
    (cleanup.players &&
      (!cleanup.players.length ||
        cleanup.players.some(
          (uuid) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(uuid),
        )))
  )
    throw new Error('invalid_history_scope');
  const db = await openDatabase();
  const next = await transaction<HistoryLease | null>(db, 'readwrite', (state, messages, done) => {
    done(null);
    const check = state.get('current');
    check.onsuccess = () => {
      const previous = readState(check.result);
      if (previous?.owner !== owner) return;
      const next = {
        ...previous,
        epoch: crypto.randomUUID(),
        clearedThrough: { ...previous.clearedThrough },
        clearedPlayersThrough: { ...previous.clearedPlayersThrough },
        workspaceEpoch: chatWorkspaceEpoch(previous) ?? undefined,
        latest: (previous.latest ?? []).filter(
          (message) => !historyMatchesCleanup(message, owner, cleanup),
        ),
      };
      for (const selected of ['public', 'private', 'staff'] as const) {
        if (channel !== 'all' && channel !== selected) continue;
        if (cleanup.players) {
          for (const player of cleanup.players)
            next.clearedPlayersThrough[player] = {
              ...next.clearedPlayersThrough[player],
              [selected]: Math.max(next.clearedPlayersThrough[player]?.[selected] ?? -1, through),
            };
        } else
          next.clearedThrough[selected] = Math.max(
            previous.clearedThrough?.[selected] ?? -1,
            through,
          );
      }
      state.put(next, 'current');
      const request = cleanupIndex(messages, cleanup).openCursor(cleanupRange(owner, cleanup));
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) {
          if (!cleanup.players) return;
          // A player's message may have supplied a channel's preview. Recover the latest survivor.
          const affected = (previous.latest ?? []).filter((message) =>
            historyMatchesCleanup(message, owner, cleanup),
          );
          let pending = affected.length;
          const complete = () => {
            if (--pending === 0) state.put(next, 'current');
          };
          for (const message of affected) {
            const conversation = messageConversation(message, owner);
            const latest = messages
              .index('conversationOrder')
              .openCursor(
                IDBKeyRange.bound([owner, conversation, ''], [owner, conversation, '\uffff']),
                'prev',
              );
            latest.onsuccess = () => {
              const candidate = latest.result;
              if (!candidate) {
                complete();
                return;
              }
              const parsed = chatMessageSchema.safeParse(candidate.value.message);
              if (
                parsed.success &&
                historyAllowsMessage(next, parsed.data) &&
                mayReadMessage(parsed.data, owner, next.staff)
              ) {
                next.latest.push(parsed.data);
                complete();
              } else candidate.continue();
            };
          }
          return;
        }
        if (historyMatchesCleanup(cursor.value.message, owner, cleanup)) cursor.delete();
        cursor.continue();
      };
      done(next);
    };
  });
  announceHistoryChange();
  return next;
}

export interface ChatHistorySnapshot {
  messages: ChatMessage[];
  readPositions: ChatReadPositions;
  historicalIds: Set<string>;
  syncPositions: HistorySyncPositions;
  latest: ChatMessage[];
  unread: Map<string, { count: number; firstId: string }>;
}

export const HISTORY_WINDOW_SIZE = 1000;

export async function loadHistory(lease: HistoryLease): Promise<ChatHistorySnapshot> {
  const owner = lease.owner;
  if (!owner || !lease.persist)
    return {
      messages: [],
      readPositions: new Map(),
      historicalIds: new Set(),
      syncPositions: {},
      latest: [],
      unread: new Map(),
    };
  const db = await openDatabase();
  return transaction(db, 'readwrite', (state, messages, done) => {
    const result: ChatMessage[] = [];
    const snapshot: ChatHistorySnapshot = {
      messages: result,
      readPositions: new Map(),
      historicalIds: new Set(),
      syncPositions: {},
      latest: [],
      unread: new Map(),
    };
    done(snapshot);
    const check = state.get('current');
    check.onsuccess = () => {
      const active = readState(check.result);
      if (!active || active.owner !== owner || active.epoch !== lease.epoch || !active.persist)
        return;
      snapshot.syncPositions = readHistorySyncPositions(active.syncPositions);
      snapshot.latest = (active.latest ?? []).filter(
        (message) =>
          mayReadMessage(message, owner, active.staff) && historyAllowsMessage(active, message),
      );
      snapshot.readPositions = new Map(active.readPositions);
      for (const message of snapshot.latest) {
        const key = messageConversation(message, owner);
        const cursor = active.readPositions.get(key);
        const bounds = unreadRange(owner, key, cursor?.order);
        const count = messages.index('unreadOrder').count(bounds);
        const first = messages.index('unreadOrder').openCursor(bounds);
        const value = { count: 0, firstId: '' };
        count.onsuccess = () => {
          value.count = count.result;
          if (value.count) snapshot.unread.set(key, value);
        };
        first.onsuccess = () => {
          if (first.result) value.firstId = first.result.value.message.id;
        };
      }
      const request = messages
        .index('ownerOrder')
        .openCursor(IDBKeyRange.bound([owner, ''], [owner, '\uffff']), 'prev');
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor || result.length >= HISTORY_WINDOW_SIZE) {
          result.sort((a, b) => compareCursors(messageCursor(a), messageCursor(b)));
          const baseline: ChatReadPositions = new Map();
          for (const message of result)
            if (!isPassiveMessage(message))
              baseline.set(messageConversation(message, owner), messageCursor(message));
          // Initialize existing records once; an explicit null remains unread across reloads.
          for (const [key, latest] of baseline) {
            snapshot.readPositions.set(
              key,
              active.readPositions.has(key) ? (active.readPositions.get(key) ?? null) : latest,
            );
          }
          state.put(
            {
              ...active,
              readPositions: new Map([...active.readPositions, ...snapshot.readPositions]),
              syncPositions: snapshot.syncPositions,
            },
            'current',
          );
          return;
        }
        const record = cursor.value as {
          owner?: unknown;
          message?: unknown;
          historical?: boolean;
        };
        const parsed = chatMessageSchema.safeParse(record.message);
        if (
          record.owner !== owner ||
          !parsed.success ||
          !historyAllowsMessage(active, parsed.data) ||
          !mayReadMessage(parsed.data, owner, active.staff)
        ) {
          if (!parsed.success) snapshot.syncPositions = {};
          cursor.delete();
        } else {
          result.push(parsed.data);
          if (record.historical) snapshot.historicalIds.add(parsed.data.id);
        }
        cursor.continue();
      };
    };
  });
}

export async function saveHistory(lease: HistoryLease, message: ChatMessage): Promise<void> {
  const owner = lease.owner;
  if (!owner || !lease.persist) return;
  const db = await openDatabase();
  await transaction<void>(db, 'readwrite', (state, messages, done) => {
    done(undefined);
    const check = state.get('current');
    check.onsuccess = () => {
      const active = readState(check.result);
      if (
        active?.owner !== owner ||
        active.epoch !== lease.epoch ||
        !active.persist ||
        !historyAllowsMessage(active, message) ||
        !mayReadMessage(message, owner, active.staff)
      )
        return;
      messages.put(storedMessage(owner, message));
      const key = messageConversation(message, owner);
      const positions = !isPassiveMessage(message)
        ? advanceReadPosition(active.readPositions, key, null)
        : active.readPositions;
      state.put(
        { ...active, latest: trackLatest(active, [message]), readPositions: positions },
        'current',
      );
    };
  });
}

export type HistorySyncWrite = 'saved' | 'conflict' | 'stale' | 'forbidden';

/** Cache a page and its resume position in one transaction. Concurrent tabs cannot move progress backwards. */
export async function saveHistorySync(
  lease: HistoryLease,
  channel: HistoryChannel,
  records: ChatMessage[],
  expected: HistorySyncPosition | undefined,
  next: HistorySyncPosition,
  historicalIds: ReadonlySet<string>,
): Promise<HistorySyncWrite> {
  const owner = lease.owner;
  if (!owner || !lease.persist) return 'stale';
  const db = await openDatabase();
  const saved = await transaction<HistorySyncWrite>(db, 'readwrite', (state, messages, done) => {
    done('stale');
    const check = state.get('current');
    check.onsuccess = () => {
      const active = readState(check.result);
      if (!active || active.owner !== owner || active.epoch !== lease.epoch || !active.persist)
        return;
      if (
        (channel === 'staff' && !active.staff) ||
        records.some(
          (message) => message.channel !== channel || !mayReadMessage(message, owner, active.staff),
        )
      ) {
        done('forbidden');
        return;
      }
      const positions = readHistorySyncPositions(active.syncPositions);
      const stored = positions[channel];
      if (stored?.checkpoint !== expected?.checkpoint || stored?.page !== expected?.page) {
        done('conflict');
        return;
      }
      for (const message of records) {
        if (!historyAllowsMessage(active, message)) continue;
        const existing = messages.get(`${owner}:${message.id}`);
        existing.onsuccess = () => {
          const wasLive = existing.result && !existing.result.historical;
          messages.put(storedMessage(owner, message, !wasLive && historicalIds.has(message.id)));
        };
      }
      state.put(
        {
          ...active,
          latest: trackLatest(active, records),
          syncPositions: { ...positions, [channel]: next },
        },
        'current',
      );
      done('saved');
    };
  });
  return saved;
}

export async function saveReadPosition(
  lease: HistoryLease,
  conversation: string,
  cursor: ChatReadCursor,
): Promise<void> {
  if (!lease.owner || !lease.persist) return;
  const db = await openDatabase();
  const changed = await transaction<boolean>(db, 'readwrite', (state, _messages, done) => {
    done(false);
    const check = state.get('current');
    check.onsuccess = () => {
      const active = readState(check.result);
      if (
        !active ||
        active.owner !== lease.owner ||
        active.epoch !== lease.epoch ||
        !active.persist ||
        (conversation === 'staff' && !active.staff)
      )
        return;
      const positions = advanceReadPosition(active.readPositions, conversation, cursor);
      if (positions !== active.readPositions) {
        state.put({ ...active, readPositions: positions }, 'current');
        done(true);
      }
    };
  });
  if (changed)
    announceHistoryChange({ owner: lease.owner, epoch: lease.epoch, conversation, cursor });
}

/** Update the local write gate before removing staff data, including writes from other tabs. */
export async function setStaffHistoryPermission(owner: string, allowed: boolean): Promise<void> {
  const db = await openDatabase();
  await transaction<void>(db, 'readwrite', (state, messages, done) => {
    done(undefined);
    const check = state.get('current');
    check.onsuccess = () => {
      const active = readState(check.result);
      if (!active || active.owner !== owner) return;
      if (active.staff === allowed) return;
      if (!allowed) active.readPositions.delete('staff');
      state.put(
        {
          ...active,
          syncPositions: { ...readHistorySyncPositions(active.syncPositions), staff: undefined },
          staff: allowed,
          latest: (active.latest ?? []).filter((message) => allowed || message.channel !== 'staff'),
          workspace: readChatWorkspace(active.workspace, allowed),
        },
        'current',
      );
      if (allowed) return;
      const request = messages.index('ownerTime').openCursor(range(owner));
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        if ((cursor.value as { message?: { channel?: string } }).message?.channel === 'staff') {
          cursor.delete();
        }
        cursor.continue();
      };
    };
  });
}

export async function loadChatWorkspace(lease: HistoryLease): Promise<ChatWorkspaceState | null> {
  const db = await openDatabase();
  return transaction(db, 'readonly', (state, _messages, done) => {
    const request = state.get('current');
    request.onsuccess = () => {
      const active = readState(request.result);
      done(
        active?.owner === lease.owner && chatWorkspaceEpoch(active) === chatWorkspaceEpoch(lease)
          ? readChatWorkspace(active.workspace, active.staff)
          : null,
      );
    };
  });
}

/** Mutate one field in a transaction so drafts in other tabs/conversations cannot overwrite it. */
export async function saveChatWorkspace(
  lease: HistoryLease,
  mutation: ChatWorkspaceMutation,
): Promise<void> {
  const db = await openDatabase();
  await transaction<void>(db, 'readwrite', (state, _messages, done) => {
    done(undefined);
    const request = state.get('current');
    request.onsuccess = () => {
      const active = readState(request.result);
      if (
        !active?.owner ||
        active.owner !== lease.owner ||
        chatWorkspaceEpoch(active) !== chatWorkspaceEpoch(lease)
      )
        return;
      if (!active.persist && mutation.type !== 'preferences') return;
      let workspace = updateChatWorkspace(
        readChatWorkspace(active.workspace, active.staff),
        mutation,
      );
      workspace = readChatWorkspace(workspace, active.staff);
      if (!active.persist) workspace = emptyChatWorkspace(workspace.preferences);
      state.put({ ...active, workspace }, 'current');
    };
  });
  announceWorkspaceChange();
}

const WORKSPACE_CHANGE_EVENT = 'mik-chat-workspace-change';
function announceWorkspaceChange() {
  window.dispatchEvent(new Event(WORKSPACE_CHANGE_EVENT));
  try {
    localStorage.setItem(WORKSPACE_CHANGE_EVENT, crypto.randomUUID());
  } catch {
    /* The IndexedDB write can succeed while localStorage is unavailable. */
  }
}

export function onWorkspaceChange(listener: () => void): () => void {
  const storage = (event: StorageEvent) => {
    if (event.key === WORKSPACE_CHANGE_EVENT || event.key === null) listener();
  };
  window.addEventListener(WORKSPACE_CHANGE_EVENT, listener);
  window.addEventListener('storage', storage);
  return () => {
    window.removeEventListener(WORKSPACE_CHANGE_EVENT, listener);
    window.removeEventListener('storage', storage);
  };
}

export function announceHistoryChange(reading?: HistoryReadChange): void {
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: reading }));
  try {
    localStorage.setItem(CHANGE_EVENT, reading ? JSON.stringify(reading) : crypto.randomUUID());
  } catch {
    /* Browser storage can be disabled. */
  }
}

function readHistoryChange(value: unknown): HistoryReadChange | undefined {
  if (!value || typeof value !== 'object') return;
  const data = value as Partial<HistoryReadChange>;
  if (
    typeof data.owner !== 'string' ||
    typeof data.epoch !== 'string' ||
    typeof data.conversation !== 'string'
  )
    return;
  const cursor = readStoredPositions(new Map([[data.conversation, data.cursor]])).get(
    data.conversation,
  );
  if (cursor)
    return { owner: data.owner, epoch: data.epoch, conversation: data.conversation, cursor };
}

export function onHistoryChange(listener: (reading?: HistoryReadChange) => void): () => void {
  const onChange = (event: Event) =>
    listener(readHistoryChange((event as CustomEvent<unknown>).detail));
  const onStorage = (event: StorageEvent) => {
    if (event.key !== CHANGE_EVENT && event.key !== null) return;
    let value: unknown;
    try {
      value = JSON.parse(event.newValue ?? 'null');
    } catch {
      /* Reset signals have no payload. */
    }
    listener(readHistoryChange(value));
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onStorage);
  };
}

function trackLatest(active: StoredState, records: ChatMessage[]) {
  const latest = new Map(
    (active.latest ?? [])
      .filter(
        (message) =>
          historyAllowsMessage(active, message) &&
          mayReadMessage(message, active.owner ?? '', active.staff),
      )
      .map((message) => [messageConversation(message, active.owner ?? ''), message]),
  );
  for (const message of records) {
    const key = messageConversation(message, active.owner ?? '');
    const previous = latest.get(key);
    if (
      historyAllowsMessage(active, message) &&
      mayReadMessage(message, active.owner ?? '', active.staff) &&
      (!previous || compareCursors(messageCursor(message), messageCursor(previous)) > 0)
    )
      latest.set(key, message);
  }
  return [...latest.values()];
}
function unreadRange(owner: string, conversation: string, order?: string) {
  return IDBKeyRange.bound(
    [owner, conversation, 1, order ?? ''],
    [owner, conversation, 1, '\uffff'],
    Boolean(order),
    false,
  );
}
export async function readUnreadSummary(
  lease: HistoryLease,
  conversation: string,
): Promise<{ count: number; firstId: string } | null> {
  const owner = lease.owner;
  if (!owner || !lease.persist) return null;
  const db = await openDatabase();
  return transaction(db, 'readonly', (state, messages, done) => {
    done(null);
    const check = state.get('current');
    check.onsuccess = () => {
      const active = readState(check.result);
      if (
        !active ||
        active.owner !== owner ||
        active.epoch !== lease.epoch ||
        !active.persist ||
        (conversation === 'staff' && !active.staff)
      )
        return;
      const range = unreadRange(owner, conversation, active.readPositions.get(conversation)?.order);
      const result = { count: 0, firstId: '' };
      const count = messages.index('unreadOrder').count(range);
      const first = messages.index('unreadOrder').openCursor(range);
      count.onsuccess = () => {
        result.count = count.result;
        if (result.count) done(result);
      };
      first.onsuccess = () => {
        if (first.result) result.firstId = first.result.value.message.id;
      };
    };
  });
}
export interface HistoryWindow {
  messages: ChatMessage[];
  historicalIds: Set<string>;
  hasMore: boolean;
}
async function readWindow(
  lease: HistoryLease,
  conversation?: string,
  before?: string,
  targetId?: string,
  after?: string,
): Promise<HistoryWindow> {
  const owner = lease.owner;
  const result: HistoryWindow = { messages: [], historicalIds: new Set(), hasMore: false };
  if (!owner || !lease.persist) return result;
  const db = await openDatabase();
  return transaction(db, 'readonly', (state, messages, done) => {
    done(result);
    const check = state.get('current');
    check.onsuccess = () => {
      const active = readState(check.result);
      if (
        !active ||
        active.owner !== owner ||
        active.epoch !== lease.epoch ||
        !active.persist ||
        (conversation === 'staff' && !active.staff)
      )
        return;
      const accept = (record: { message: unknown; historical?: boolean }) => {
        const parsed = chatMessageSchema.safeParse(record.message);
        if (
          !parsed.success ||
          !mayReadMessage(parsed.data, owner, active.staff) ||
          !historyAllowsMessage(active, parsed.data) ||
          (conversation && messageConversation(parsed.data, owner) !== conversation)
        )
          return null;
        result.messages.push(parsed.data);
        if (record.historical) result.historicalIds.add(parsed.data.id);
        return parsed.data;
      };
      const scan = (upper?: string) => {
        const prefix = conversation ? [owner, conversation] : [owner];
        const range = IDBKeyRange.bound(
          [...prefix, after ?? ''],
          [...prefix, upper ?? '\uffff'],
          Boolean(after),
          Boolean(upper),
        );
        const request = messages
          .index(conversation ? 'conversationOrder' : 'ownerOrder')
          .openCursor(range, after ? 'next' : 'prev');
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) {
            if (!after) result.messages.reverse();
            return;
          }
          if (result.messages.length >= 256) {
            result.hasMore = true;
            if (!after) result.messages.reverse();
            return;
          }
          accept(cursor.value);
          cursor.continue();
        };
      };
      if (!targetId) scan(before);
      else {
        const target = messages.get(`${owner}:${targetId}`);
        target.onsuccess = () => {
          if (!target.result) return;
          const message = accept(target.result);
          if (message) scan(message.order);
        };
      }
    };
  });
}
export function readHistoryWindow(
  lease: HistoryLease,
  conversation: string,
  before?: string,
  targetId?: string,
  after?: string,
) {
  return readWindow(lease, conversation, before, targetId, after);
}
export function readHistoryBatch(lease: HistoryLease, before?: string) {
  return readWindow(lease, undefined, before);
}
