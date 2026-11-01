import type { ChatMessage } from '@/modules/chat/model/chat-protocol';
import { chatMessageSchema, mayReadMessage } from '@/modules/chat/model/chat-protocol';

export interface HistoryLease {
  owner: string | null;
  epoch: string;
  persist: boolean;
}

const CHANGE_EVENT = 'mik-chat-history-change';
const MAX_RECORDS = 1000;
const MAX_AGE = 30 * 24 * 60 * 60 * 1000;
let database: Promise<IDBDatabase> | undefined;

function openDatabase(): Promise<IDBDatabase> {
  database ??= new Promise((resolve, reject) => {
    const request = indexedDB.open('mik-chat', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore('state');
      const messages = db.createObjectStore('messages', { keyPath: 'key' });
      messages.createIndex('ownerTime', ['owner', 'createdAt']);
    };
    request.onerror = () => {
      database = undefined;
      reject(request.error);
    };
    request.onblocked = () => {
      database = undefined;
      reject(new Error('history_blocked'));
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => {
        request.result.close();
        database = undefined;
      };
      resolve(request.result);
    };
  });
  return database;
}

function range(owner: string): IDBKeyRange {
  return IDBKeyRange.bound([owner, 0], [owner, Number.MAX_SAFE_INTEGER]);
}

interface StoredState extends HistoryLease {
  staff: boolean;
}

function readState(value: unknown): StoredState | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<StoredState>;
  return (typeof candidate.owner === 'string' || candidate.owner === null) &&
    typeof candidate.epoch === 'string' &&
    typeof candidate.persist === 'boolean' &&
    typeof candidate.staff === 'boolean'
    ? (candidate as StoredState)
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
        lease = { owner, epoch: crypto.randomUUID(), persist: true, staff: false };
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
      const next = { ...previous, persist: true };
      state.put(next, 'current');
      for (const message of records) {
        if (
          message.createdAt <= Date.now() - MAX_AGE ||
          !mayReadMessage(message, owner, next.staff)
        )
          continue;
        messages.put({
          key: `${owner}:${message.id}`,
          owner,
          createdAt: message.createdAt,
          message,
        });
      }
      trimHistory(messages, owner);
      done(next);
    };
  });
  announceHistoryChange();
  return lease;
}

function trimHistory(messages: IDBObjectStore, owner: string): void {
  const index = messages.index('ownerTime');
  const count = index.count(range(owner));
  count.onsuccess = () => {
    let excess = count.result - MAX_RECORDS;
    if (excess <= 0) return;
    const oldest = index.openCursor(range(owner));
    oldest.onsuccess = () => {
      const cursor = oldest.result;
      if (!cursor) return;
      cursor.delete();
      if (--excess > 0) cursor.continue();
    };
  };
}

export async function loadHistory(lease: HistoryLease): Promise<ChatMessage[]> {
  const owner = lease.owner;
  if (!owner || !lease.persist) return [];
  const db = await openDatabase();
  return transaction(db, 'readwrite', (state, messages, done) => {
    const result: ChatMessage[] = [];
    done(result);
    const check = state.get('current');
    check.onsuccess = () => {
      const active = readState(check.result);
      if (!active || active.owner !== owner || active.epoch !== lease.epoch || !active.persist)
        return;
      const request = messages.index('ownerTime').openCursor(range(owner), 'prev');
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) {
          result.reverse();
          return;
        }
        const record = cursor.value as { owner?: unknown; message?: unknown };
        const parsed = chatMessageSchema.safeParse(record.message);
        if (
          record.owner !== owner ||
          !parsed.success ||
          parsed.data.createdAt <= Date.now() - MAX_AGE ||
          !mayReadMessage(parsed.data, owner, active.staff)
        ) {
          cursor.delete();
        } else if (result.length < 500) result.push(parsed.data);
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
      messages.put({ key: `${owner}:${message.id}`, owner, createdAt: message.createdAt, message });
      trimHistory(messages, owner);
    };
  });
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
      state.put({ ...active, staff: allowed }, 'current');
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

export function announceHistoryChange(): void {
  window.dispatchEvent(new Event(CHANGE_EVENT));
  try {
    localStorage.setItem(CHANGE_EVENT, crypto.randomUUID());
  } catch {
    /* Browser storage can be disabled. */
  }
}

export function onHistoryChange(listener: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === CHANGE_EVENT || event.key === null) listener();
  };
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener('storage', onStorage);
  };
}
