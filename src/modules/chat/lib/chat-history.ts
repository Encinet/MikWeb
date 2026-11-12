import { openChatHistoryDatabase as openDatabase } from '@/modules/chat/lib/chat-history-database';
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
  CHAT_ACTIVITY_LIMIT,
  CHAT_HISTORY_LIMIT,
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
}

interface HistoryReadChange {
  owner: string;
  epoch: string;
  conversation: string;
  cursor: ChatReadCursor;
}

const CHANGE_EVENT = 'mik-chat-history-change';
const HISTORY_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function range(owner: string): IDBKeyRange {
  return IDBKeyRange.bound(
    [owner, 0, 0],
    [owner, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
  );
}

function storedMessage(owner: string, message: ChatMessage) {
  return {
    key: `${owner}:${message.id}`,
    owner,
    createdAt: message.createdAt,
    sequence: message.sequence,
    bucket: isPassiveMessage(message) ? 'activity' : 'conversation',
    message,
  };
}

interface StoredState extends HistoryLease {
  staff: boolean;
  readPositions: ChatReadPositions;
  workspace?: ChatWorkspaceState;
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
        if (
          message.createdAt <= Date.now() - HISTORY_MAX_AGE_MS ||
          !mayReadMessage(message, owner, next.staff)
        )
          continue;
        messages.put(storedMessage(owner, message));
      }
      trimHistory(messages, owner);
      done(next);
    };
  });
  announceHistoryChange();
  return lease;
}

function trimHistory(messages: IDBObjectStore, owner: string): void {
  const index = messages.index('ownerBucketTime');
  for (const [bucket, limit] of [
    ['activity', CHAT_ACTIVITY_LIMIT],
    ['conversation', CHAT_HISTORY_LIMIT],
  ] as const) {
    const scope = IDBKeyRange.bound(
      [owner, bucket, 0, 0],
      [owner, bucket, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
    );
    const count = index.count(scope);
    count.onsuccess = () => {
      let excess = count.result - limit;
      if (excess <= 0) return;
      const oldest = index.openCursor(scope);
      oldest.onsuccess = () => {
        const cursor = oldest.result;
        if (!cursor) return;
        cursor.delete();
        if (--excess > 0) cursor.continue();
      };
    };
  }
}

export interface ChatHistorySnapshot {
  messages: ChatMessage[];
  readPositions: ChatReadPositions;
}

export async function loadHistory(lease: HistoryLease): Promise<ChatHistorySnapshot> {
  const owner = lease.owner;
  if (!owner || !lease.persist) return { messages: [], readPositions: new Map() };
  const db = await openDatabase();
  return transaction(db, 'readwrite', (state, messages, done) => {
    const result: ChatMessage[] = [];
    let activity = 0;
    let conversation = 0;
    const snapshot: ChatHistorySnapshot = { messages: result, readPositions: new Map() };
    done(snapshot);
    const check = state.get('current');
    check.onsuccess = () => {
      const active = readState(check.result);
      if (!active || active.owner !== owner || active.epoch !== lease.epoch || !active.persist)
        return;
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
          state.put({ ...active, readPositions: snapshot.readPositions }, 'current');
          return;
        }
        const record = cursor.value as { owner?: unknown; message?: unknown };
        const parsed = chatMessageSchema.safeParse(record.message);
        if (
          record.owner !== owner ||
          !parsed.success ||
          parsed.data.createdAt <= Date.now() - HISTORY_MAX_AGE_MS ||
          !mayReadMessage(parsed.data, owner, active.staff)
        ) {
          cursor.delete();
        } else {
          const keep = isPassiveMessage(parsed.data)
            ? ++activity <= CHAT_ACTIVITY_LIMIT
            : ++conversation <= CHAT_HISTORY_LIMIT;
          if (keep) result.push(parsed.data);
          else cursor.delete();
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
      trimHistory(messages, owner);
    };
  });
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
        { ...active, staff: allowed, workspace: readChatWorkspace(active.workspace, allowed) },
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
        active?.owner === lease.owner && active.epoch === lease.epoch
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
      if (!active?.owner || active.owner !== lease.owner || active.epoch !== lease.epoch) return;
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
