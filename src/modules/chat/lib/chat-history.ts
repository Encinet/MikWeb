import { openChatHistoryDatabase as openDatabase } from '@/modules/chat/lib/chat-history-database';
import type {
  HistoryChannel,
  HistorySyncPosition,
  HistorySyncPositions,
} from '@/modules/chat/model/chat-history-sync';
import { readHistorySyncPositions } from '@/modules/chat/model/chat-history-sync';
import type { ChatMessage } from '@/modules/chat/model/chat-protocol';
import {
  chatMessageSchema,
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
  ChatWorkspaceMutation,
  ChatWorkspaceState,
} from '@/modules/chat/model/chat-workspace';
import {
  emptyChatWorkspace,
  readChatWorkspace,
  updateChatWorkspace,
} from '@/modules/chat/model/chat-workspace';

export interface HistoryLease {
  owner: string | null;
  epoch: string;
  persist: boolean;
  clearedThrough?: Partial<Record<HistoryChannel, number>>;
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
  return message.createdAt > (lease?.clearedThrough?.[message.channel] ?? -1);
}

function range(owner: string, through = Number.MAX_SAFE_INTEGER): IDBKeyRange {
  return IDBKeyRange.bound([owner, 0, 0], [owner, through, Number.MAX_SAFE_INTEGER]);
}

function storedMessage(owner: string, message: ChatMessage, historical = false) {
  return {
    key: `${owner}:${message.id}`,
    owner,
    createdAt: message.createdAt,
    sequence: message.sequence,
    bucket: isPassiveMessage(message) ? 'activity' : 'conversation',
    channel: message.channel,
    message,
    historical,
  };
}

interface StoredState extends HistoryLease {
  staff: boolean;
  readPositions: ChatReadPositions;
  workspace?: ChatWorkspaceState;
  syncPositions?: HistorySyncPositions;
}

function readState(value: unknown): StoredState | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<StoredState>;
  return (typeof candidate.owner === 'string' || candidate.owner === null) &&
    typeof candidate.epoch === 'string' &&
    typeof candidate.persist === 'boolean' &&
    typeof candidate.staff === 'boolean'
    ? { ...(candidate as StoredState), readPositions: readStoredPositions(candidate.readPositions) }
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
}

function cleanupRange(owner: string, cleanup: HistoryCleanup): IDBKeyRange {
  return cleanup.channel === 'all'
    ? range(owner, cleanup.through)
    : IDBKeyRange.bound(
        [owner, cleanup.channel, 0, 0],
        [owner, cleanup.channel, cleanup.through, Number.MAX_SAFE_INTEGER],
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
      const matching = cleanupIndex(messages, cleanup).count(cleanupRange(owner, cleanup));
      matching.onsuccess = () => {
        summary.matching = matching.result;
      };
      const oldest = index.openKeyCursor(range(owner));
      oldest.onsuccess = () => {
        if (oldest.result) summary.oldestAt = (oldest.result.key as [string, number, number])[1];
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
        workspaceEpoch: chatWorkspaceEpoch(previous) ?? undefined,
      };
      for (const selected of ['public', 'private', 'staff'] as const) {
        if (channel === 'all' || channel === selected)
          next.clearedThrough[selected] = Math.max(
            previous.clearedThrough?.[selected] ?? -1,
            through,
          );
      }
      state.put(next, 'current');
      const request = cleanupIndex(messages, cleanup).openKeyCursor(cleanupRange(owner, cleanup));
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        messages.delete(cursor.primaryKey);
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
}

export async function loadHistory(lease: HistoryLease): Promise<ChatHistorySnapshot> {
  const owner = lease.owner;
  if (!owner || !lease.persist)
    return { messages: [], readPositions: new Map(), historicalIds: new Set(), syncPositions: {} };
  const db = await openDatabase();
  return transaction(db, 'readwrite', (state, messages, done) => {
    const result: ChatMessage[] = [];
    const snapshot: ChatHistorySnapshot = {
      messages: result,
      readPositions: new Map(),
      historicalIds: new Set(),
      syncPositions: {},
    };
    done(snapshot);
    const check = state.get('current');
    check.onsuccess = () => {
      const active = readState(check.result);
      if (!active || active.owner !== owner || active.epoch !== lease.epoch || !active.persist)
        return;
      snapshot.syncPositions = readHistorySyncPositions(active.syncPositions);
      const request = messages.index('ownerTime').openCursor(range(owner), 'prev');
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) {
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
              readPositions: snapshot.readPositions,
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
      if (positions !== active.readPositions)
        state.put({ ...active, readPositions: positions }, 'current');
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
      if (
        stored?.databaseId !== expected?.databaseId ||
        stored?.visibilityScope !== expected?.visibilityScope ||
        stored?.after !== expected?.after ||
        stored?.head !== expected?.head ||
        stored?.before !== expected?.before
      ) {
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
      state.put({ ...active, syncPositions: { ...positions, [channel]: next } }, 'current');
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
