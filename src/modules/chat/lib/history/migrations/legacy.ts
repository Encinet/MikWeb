import type { ChatMessage } from '@/modules/chat/model/chat-protocol';
import {
  chatMessageSchema,
  countsAsUnread,
  isPassiveMessage,
  mayReadMessage,
  messageConversation,
} from '@/modules/chat/model/chat-protocol';
import { isRecord } from '@/shared/lib/is-record';

const MAX_TIE = 0x1fffff;

export function hasLegacyChatHistorySchema(
  db: IDBDatabase,
  tx: IDBTransaction,
  version: number,
): boolean {
  if (!db.objectStoreNames.contains('state') || !db.objectStoreNames.contains('messages'))
    return false;
  const messages = tx.objectStore('messages');
  const indexes = {
    ownerTime: ['owner', 'createdAt', 'sequence'],
    ownerBucketTime: ['owner', 'bucket', 'createdAt', 'sequence'],
    ...(version === 4 ? { ownerChannelTime: ['owner', 'channel', 'createdAt', 'sequence'] } : {}),
  };
  return (
    tx.objectStore('state').keyPath === null &&
    messages.keyPath === 'key' &&
    Object.entries(indexes).every(
      ([name, keys]) =>
        messages.indexNames.contains(name) &&
        JSON.stringify(messages.index(name).keyPath) === JSON.stringify(keys),
    )
  );
}

/** Local ordering for the former time/sequence protocol; never sent to the server. */
function legacyOrder(value: Record<string, unknown>, tie = MAX_TIE): string {
  const { createdAt, sequence } = value;
  if (
    typeof createdAt !== 'number' ||
    !Number.isSafeInteger(createdAt) ||
    createdAt < 0 ||
    createdAt > 0xffffffffffff ||
    typeof sequence !== 'number' ||
    !Number.isSafeInteger(sequence) ||
    sequence <= 0 ||
    tie > MAX_TIE
  )
    throw new Error('history_schema_unavailable');
  const time = createdAt.toString(16).padStart(12, '0');
  const rank = (BigInt(sequence) << BigInt(21)) | BigInt(tie);
  const high = (rank >> BigInt(62)).toString(16).padStart(3, '0');
  const low = (
    (rank & ((BigInt(1) << BigInt(62)) - BigInt(1))) |
    (BigInt(1) << BigInt(63))
  ).toString(16);
  return `${time.slice(0, 8)}-${time.slice(8)}-7${high}-${low.slice(0, 4)}-${low.slice(4)}`;
}

/** Convert v2–v4 in the version-change transaction so any failure preserves the old database. */
export function upgradeLegacyChatHistory(tx: IDBTransaction, complete: () => void) {
  const state = tx.objectStore('state');
  const messages = tx.objectStore('messages');
  const request = state.get('current');
  request.onsuccess = () => {
    try {
      const active: unknown = request.result;
      if (active !== undefined && !isRecord(active)) throw new Error('history_schema_unavailable');
      if (
        active &&
        ((typeof active.owner !== 'string' && active.owner !== null) ||
          typeof active.epoch !== 'string' ||
          typeof active.persist !== 'boolean' ||
          typeof active.staff !== 'boolean')
      )
        throw new Error('history_schema_unavailable');
      const cursors = new Map<string, Record<string, unknown>[]>();
      const convertCursor = (value: unknown) => {
        if (value === null) return null;
        if (!isRecord(value) || typeof value.messageId !== 'string')
          throw new Error('history_schema_unavailable');
        const converted = {
          messageId: value.messageId,
          createdAt: value.createdAt,
          order: legacyOrder(value),
        };
        const targets = cursors.get(value.messageId) ?? [];
        targets.push(converted);
        cursors.set(value.messageId, targets);
        return converted;
      };
      if (active) {
        if (active.readPositions instanceof Map)
          active.readPositions = new Map(
            [...active.readPositions].map(([key, value]) => [key, convertCursor(value)]),
          );
        if (isRecord(active.workspace) && isRecord(active.workspace.threads)) {
          for (const thread of Object.values(active.workspace.threads)) {
            if (!isRecord(thread)) throw new Error('history_schema_unavailable');
            thread.closedThrough = convertCursor(thread.closedThrough);
          }
        }
        // Decimal sequence checkpoints cannot be reused with the new opaque server tokens.
        active.syncPositions = {};
      }
      const latest = new Map<string, ChatMessage>();
      let previous = '';
      let tie = 0;
      // An index omits malformed keys. Never commit a conversion that silently skips records.
      const total = messages.count();
      const indexed = messages.index('ownerTime').count();
      indexed.onsuccess = () => {
        if (indexed.result !== total.result) tx.abort();
      };
      const records = messages.index('ownerTime').openCursor();
      records.onsuccess = () => {
        try {
          const cursor = records.result;
          if (!cursor) {
            if (active) {
              active.latest = [...latest.values()];
              state.put(active, 'current');
            }
            complete();
            return;
          }
          const record: unknown = cursor.value;
          if (!isRecord(record) || typeof record.owner !== 'string' || !isRecord(record.message))
            throw new Error('history_schema_unavailable');
          const original = record.message;
          if (record.createdAt !== original.createdAt || record.sequence !== original.sequence)
            throw new Error('history_schema_unavailable');
          const key = JSON.stringify([record.owner, original.createdAt, original.sequence]);
          tie = key === previous ? tie + 1 : 0;
          previous = key;
          let value: Record<string, unknown> = { ...original, order: legacyOrder(original, tie) };
          if (original.kind === 'player') {
            value = {
              ...value,
              kind: 'user',
              sender: {
                id: original.senderUuid,
                name: original.senderName,
                playerUuid: original.senderUuid,
                playerName: original.senderName,
              },
              source: { kind: original.source },
            };
          }
          const message = chatMessageSchema.parse(value);
          for (const target of cursors.get(message.id) ?? []) target.order = message.order;
          const conversation = messageConversation(message, record.owner);
          cursor.update({
            ...record,
            message,
            order: message.order,
            channel: message.channel,
            conversation,
            bucket: isPassiveMessage(message) ? 'activity' : 'conversation',
            unread: !record.historical && countsAsUnread(message, record.owner) ? 1 : 0,
          });
          if (
            active?.owner === record.owner &&
            mayReadMessage(message, record.owner, active.staff === true) &&
            (!isRecord(active.clearedThrough) ||
              message.createdAt > ((active.clearedThrough[message.channel] as number) ?? -1))
          )
            latest.set(conversation, message);
          cursor.continue();
        } catch {
          tx.abort();
        }
      };
    } catch {
      tx.abort();
    }
  };
}
