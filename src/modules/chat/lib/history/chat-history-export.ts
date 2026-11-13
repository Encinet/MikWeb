import type { HistoryCleanup, HistoryLease } from '@/modules/chat/lib/history/chat-history';
import {
  historyAllowsMessage,
  historyMatchesCleanup,
} from '@/modules/chat/lib/history/chat-history';
import { readStoredMessage } from '@/modules/chat/lib/history/chat-history-codec';
import { openChatHistoryDatabase } from '@/modules/chat/lib/history/chat-history-database';
import type { ChatMessage } from '@/modules/chat/model/chat-protocol';
import { mayReadMessage } from '@/modules/chat/model/chat-protocol';

export type HistoryExportFormat = 'json' | 'txt';
interface Bookmark {
  index: IDBValidKey;
  primary: IDBValidKey;
}
interface ExportSession {
  lease: HistoryLease;
  staff: boolean;
  selection: HistoryCleanup;
  signal: AbortSignal;
}
interface ExportPage {
  messages: ChatMessage[];
  ceiling?: Bookmark;
  next?: Bookmark;
}

function checkSession(value: unknown, session: ExportSession): asserts value is HistoryLease {
  session.signal.throwIfAborted();
  const active = value as {
    owner?: unknown;
    epoch?: unknown;
    staff?: unknown;
    persist?: unknown;
  } | null;
  if (
    !active ||
    active.owner !== session.lease.owner ||
    active.epoch !== session.lease.epoch ||
    active.staff !== session.staff ||
    active.persist !== true
  )
    throw new Error('history_export_changed');
}

/** Bounded transactions let live writes, permission changes and cancellation run between pages. */
function readExportPage(
  db: IDBDatabase,
  session: ExportSession,
  after?: Bookmark,
  ceiling?: Bookmark,
): Promise<ExportPage> {
  const owner = session.lease.owner;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['state', 'messages']);
    const result: ExportPage = { messages: [], ceiling };
    let failure: unknown;
    const abort = () => tx.abort();
    const fail = (error: unknown) => {
      failure = error;
      tx.abort();
    };
    session.signal.addEventListener('abort', abort, { once: true });
    const release = () => session.signal.removeEventListener('abort', abort);
    tx.oncomplete = () => {
      release();
      resolve(result);
    };
    tx.onabort = tx.onerror = () => {
      release();
      reject(failure ?? session.signal.reason ?? tx.error ?? new Error('history_unavailable'));
    };
    const state = tx.objectStore('state').get('current');
    state.onsuccess = () => {
      try {
        checkSession(state.result, session);
      } catch (error) {
        fail(error);
        return;
      }
      const active = state.result as HistoryLease;
      const index = tx.objectStore('messages').index('ownerOrder');
      const scan = (upper: Bookmark) => {
        let scanned = 0;
        const request = index.openCursor(
          IDBKeyRange.bound(after?.index ?? [owner, ''], upper.index),
        );
        request.onsuccess = () => {
          try {
            session.signal.throwIfAborted();
            const cursor = request.result;
            if (!cursor) return;
            // Resume with both keys: equal message orders must not skip records at a page boundary.
            if (after && indexedDB.cmp(cursor.key, after.index) === 0) {
              const compared = indexedDB.cmp(cursor.primaryKey, after.primary);
              if (compared < 0) {
                cursor.continuePrimaryKey(after.index, after.primary);
                return;
              }
              if (compared === 0) {
                cursor.continue();
                return;
              }
            }
            if (
              indexedDB.cmp(cursor.key, upper.index) === 0 &&
              indexedDB.cmp(cursor.primaryKey, upper.primary) > 0
            )
              return;
            const message = readStoredMessage(cursor.value);
            if (!message) throw new Error('history_export_invalid');
            if (
              mayReadMessage(message, owner ?? '', session.staff) &&
              historyAllowsMessage(active, message) &&
              historyMatchesCleanup(message, owner ?? '', session.selection)
            )
              result.messages.push(message);
            if (++scanned === 256) result.next = { index: cursor.key, primary: cursor.primaryKey };
            else cursor.continue();
          } catch (error) {
            fail(error);
          }
        };
      };
      try {
        if (ceiling) scan(ceiling);
        else {
          // An index omits malformed keys. Do not silently call a partial archive complete.
          const total = tx.objectStore('messages').count();
          const indexed = index.count();
          indexed.onsuccess = () => {
            if (indexed.result !== total.result) fail(new Error('history_export_invalid'));
          };
          const last = index.openKeyCursor(
            IDBKeyRange.bound([owner, ''], [owner, '\uffff']),
            'prev',
          );
          last.onsuccess = () => {
            try {
              const cursor = last.result;
              if (!cursor) return;
              result.ceiling = { index: cursor.key, primary: cursor.primaryKey };
              scan(result.ceiling);
            } catch (error) {
              fail(error);
            }
          };
        }
      } catch (error) {
        fail(error);
      }
    };
  });
}

export interface HistoryTextLabels {
  channels: Record<ChatMessage['channel'], string>;
  sources: { game: string; web: string };
  server: string;
  you: string;
  date: (time: number) => string;
  activity: (content: Exclude<ChatMessage['content'], unknown[]>) => string;
}

export function historyMessageText(
  message: ChatMessage,
  owner: string,
  labels: HistoryTextLabels,
): string {
  const content = Array.isArray(message.content)
    ? message.content
        .map((part) => part.text + (part.href && part.href !== part.text ? ` (${part.href})` : ''))
        .join('')
    : labels.activity(message.content);
  const singleLine = (value: string) =>
    [...value]
      .map((character) => {
        const code = character.codePointAt(0) ?? 0;
        return code < 32 || (code >= 127 && code <= 159) ? ' ' : character;
      })
      .join('');
  const name = message.kind === 'user' ? message.sender.name : labels.server;
  const source =
    message.kind === 'server'
      ? ''
      : ` [${singleLine(message.source.kind === 'social' ? message.source.platformName : labels.sources[message.source.kind])}]`;
  const target =
    message.channel === 'private'
      ? ` → ${singleLine(message.targetUuid === owner ? labels.you : message.targetName || message.targetUuid || '')}`
      : '';
  return `[${labels.date(message.createdAt)}] [${labels.channels[message.channel]}]${source} ${singleLine(name)}${target}: ${content.replace(/\r\n?/g, '\n').replaceAll('\n', '\n  ')}\n`;
}

export async function exportChatHistory({
  lease,
  staff,
  selection,
  format,
  signal,
  text,
  onProgress,
}: ExportSession & {
  format: HistoryExportFormat;
  text: { header: string; labels: HistoryTextLabels };
  onProgress?: (count: number) => void;
}): Promise<{ blob: Blob; count: number; filename: string }> {
  if (!lease.owner || !lease.persist) throw new Error('history_export_changed');
  if (
    !Number.isSafeInteger(selection.through) ||
    selection.through < 0 ||
    !['all', 'public', 'private', 'staff'].includes(selection.channel) ||
    (selection.players && !selection.players.length)
  )
    throw new Error('invalid_history_selection');
  signal.throwIfAborted();
  // Copy the filter once so later UI changes cannot broaden an in-flight export.
  const session: ExportSession = {
    lease: { ...lease },
    staff,
    selection: { ...selection, ...(selection.players ? { players: [...selection.players] } : {}) },
    signal,
  };
  const exportedAt = new Date().toISOString();
  const metadata = {
    format: 'mik-chat-history',
    version: 1,
    exportedAt,
    owner: lease.owner,
    selection: {
      ...session.selection,
      through:
        session.selection.through === Number.MAX_SAFE_INTEGER ? null : session.selection.through,
    },
  };
  const chunks: BlobPart[] = [
    format === 'json'
      ? `${JSON.stringify(metadata).slice(0, -1)},"messages":[\n`
      : `\ufeff${text.header}\n\n`,
  ];
  let count = 0;
  let after: Bookmark | undefined;
  let ceiling: Bookmark | undefined;
  const db = await openChatHistoryDatabase();
  do {
    const page = await readExportPage(db, session, after, ceiling);
    signal.throwIfAborted();
    if (page.messages.length) {
      // Encode one page at a time; Blob chunks avoid retaining the parsed archive or one giant string.
      const lines = page.messages.map((message) =>
        format === 'json'
          ? JSON.stringify(message)
          : historyMessageText(message, lease.owner ?? '', text.labels),
      );
      chunks.push(
        new Blob([
          format === 'json' ? `${count ? ',\n' : ''}${lines.join(',\n')}` : lines.join(''),
        ]),
      );
      count += page.messages.length;
      onProgress?.(count);
    }
    after = page.next;
    ceiling = page.ceiling;
    if (after) await new Promise((resolve) => setTimeout(resolve, 0));
  } while (after);
  // Recheck after queued writes get a turn, including cleanup or account changes during the final page.
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('state');
    const request = tx.objectStore('state').get('current');
    let failure: unknown;
    request.onsuccess = () => {
      try {
        checkSession(request.result, session);
      } catch (error) {
        failure = error;
        tx.abort();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onabort = tx.onerror = () => reject(failure ?? tx.error ?? new Error('history_unavailable'));
  });
  signal.throwIfAborted();
  if (!count) throw new Error('history_export_empty');
  if (format === 'json') chunks.push(`\n],"count":${count}}\n`);
  return {
    blob: new Blob(chunks, {
      type: format === 'json' ? 'application/json;charset=utf-8' : 'text/plain;charset=utf-8',
    }),
    count,
    filename: `mik-chat-${exportedAt.replace(/[:.]/g, '-')}.${format}`,
  };
}
