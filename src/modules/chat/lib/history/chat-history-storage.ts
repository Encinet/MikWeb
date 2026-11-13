import type { HistoryCleanup, HistoryLease } from '@/modules/chat/lib/history/chat-history';
import { historyAllowsMessage } from '@/modules/chat/lib/history/chat-history';
import { openChatHistoryDatabase } from '@/modules/chat/lib/history/chat-history-database';
import { historyMessagePlayer } from '@/modules/chat/lib/history/chat-history-player';
import { chatMessageSchema, mayReadMessage } from '@/modules/chat/model/chat-protocol';
import type { HistoryChannel } from '@/modules/chat/model/history/chat-history-sync';

export const HISTORY_AGES = [0, 30, 90, 365] as const;
export type HistoryAge = (typeof HISTORY_AGES)[number];
export interface HistoryUsage {
  count: number;
  bytes: number;
}
export interface HistoryPlayerUsage extends HistoryUsage {
  uuid: string;
  name: string;
  latestAt: number;
}
interface HistoryUsageBucket extends HistoryUsage {
  channel: HistoryChannel;
  player: string | null;
  age: number;
}
export interface HistoryStorageReport extends HistoryUsage {
  oldestAt: number | null;
  latestAt: number | null;
  channels: Record<HistoryChannel, HistoryUsage>;
  players: HistoryPlayerUsage[];
  buckets: HistoryUsageBucket[];
}

/** A single cursor aggregates metadata without retaining the message archive in memory. */
export async function readHistoryStorageReport(
  lease: HistoryLease,
  now: number,
  signal?: AbortSignal,
): Promise<HistoryStorageReport | null> {
  const owner = lease.owner;
  if (!owner || signal?.aborted) return null;
  const db = await openChatHistoryDatabase();
  if (signal?.aborted) return null;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['state', 'messages'], 'readonly');
    let result: HistoryStorageReport | null = null;
    const players = new Map<string, HistoryPlayerUsage>();
    const buckets = new Map<string, HistoryUsageBucket>();
    const encoder = new TextEncoder();
    tx.oncomplete = () => {
      if (result) {
        result.players = [...players.values()];
        result.buckets = [...buckets.values()];
      }
      resolve(signal?.aborted ? null : result);
    };
    tx.onerror = tx.onabort = () => reject(tx.error ?? new Error('history_unavailable'));
    const check = tx.objectStore('state').get('current');
    check.onsuccess = () => {
      const active = check.result;
      if (active?.owner !== owner || active.epoch !== lease.epoch || signal?.aborted) return;
      const report: HistoryStorageReport = {
        count: 0,
        bytes: 0,
        oldestAt: null,
        latestAt: null,
        channels: {
          public: { count: 0, bytes: 0 },
          private: { count: 0, bytes: 0 },
          staff: { count: 0, bytes: 0 },
        },
        players: [],
        buckets: [],
      };
      result = report;
      const request = tx
        .objectStore('messages')
        .index('ownerTime')
        .openCursor(IDBKeyRange.bound([owner, 0, ''], [owner, Number.MAX_SAFE_INTEGER, '\uffff']));
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor || signal?.aborted) return;
        const parsed = chatMessageSchema.safeParse(cursor.value.message);
        if (!parsed.success) {
          cursor.continue();
          return;
        }
        const message = parsed.data;
        if (mayReadMessage(message, owner, active.staff) && historyAllowsMessage(active, message)) {
          // Serialized message size is comparable across channels, not an on-disk database size.
          const bytes = encoder.encode(JSON.stringify(message)).byteLength;
          const player = historyMessagePlayer(message, owner);
          const age =
            message.createdAt > now
              ? -1
              : ([...HISTORY_AGES]
                  .reverse()
                  .find((days) => message.createdAt <= now - days * 86_400_000) ?? 0);
          const key = `${message.channel}:${player?.uuid ?? ''}:${age}`;
          const bucket = buckets.get(key) ?? {
            channel: message.channel,
            player: player?.uuid ?? null,
            age,
            count: 0,
            bytes: 0,
          };
          bucket.count++;
          bucket.bytes += bytes;
          buckets.set(key, bucket);
          report.count++;
          report.bytes += bytes;
          report.oldestAt = Math.min(report.oldestAt ?? message.createdAt, message.createdAt);
          report.latestAt = Math.max(report.latestAt ?? message.createdAt, message.createdAt);
          const channel = report.channels[message.channel as HistoryChannel];
          channel.count++;
          channel.bytes += bytes;
          if (player) {
            const value = players.get(player.uuid) ?? {
              ...player,
              latestAt: message.createdAt,
              count: 0,
              bytes: 0,
            };
            value.count++;
            value.bytes += bytes;
            if (message.createdAt >= value.latestAt) {
              value.name = player.name;
              value.latestAt = message.createdAt;
            }
            players.set(player.uuid, value);
          }
        }
        cursor.continue();
      };
    };
  });
}

/** Filter changes reuse the same snapshot, so typing and selecting never rescan the database. */
export function selectHistoryUsage(
  report: HistoryStorageReport,
  channel: HistoryCleanup['channel'],
  age: HistoryAge,
  players?: readonly string[],
): HistoryUsage {
  const selected = players ? new Set(players) : null;
  return report.buckets.reduce(
    (total, bucket) => {
      if (
        (channel === 'all' || bucket.channel === channel) &&
        bucket.age >= age &&
        (!selected || (bucket.player !== null && selected.has(bucket.player)))
      ) {
        total.count += bucket.count;
        total.bytes += bucket.bytes;
      }
      return total;
    },
    { count: 0, bytes: 0 },
  );
}
