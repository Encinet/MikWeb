import { z } from 'zod';
import type { ChatServerEvent } from '@/modules/chat/model/chat-protocol';
import { historyPosition } from '@/modules/chat/model/chat-protocol';

export type HistoryChannel = 'public' | 'staff' | 'private';
const positionSchema = z
  .object({
    databaseId: z.string().uuid(),
    visibilityScope: z.string().uuid(),
    after: historyPosition,
    head: historyPosition.optional(),
    before: historyPosition.optional(),
  })
  .refine((value) => {
    if (
      !historyPosition.safeParse(value.after).success ||
      (value.head && !historyPosition.safeParse(value.head).success) ||
      (value.before && !historyPosition.safeParse(value.before).success)
    )
      return false;
    return (
      Boolean(value.head) === Boolean(value.before) &&
      (!value.head ||
        (Boolean(value.before) &&
          BigInt(value.head) >= BigInt(value.before ?? '0') &&
          BigInt(value.before ?? '0') > BigInt(value.after)))
    );
  });
export type HistorySyncPosition = z.infer<typeof positionSchema>;
export type HistorySyncPositions = Partial<Record<HistoryChannel, HistorySyncPosition>>;

export function readHistorySyncPositions(value: unknown): HistorySyncPositions {
  const parsed = z
    .object({
      public: positionSchema.optional(),
      staff: positionSchema.optional(),
      private: positionSchema.optional(),
    })
    .safeParse(value);
  return parsed.success ? parsed.data : {};
}

/** Freeze the first page's head; arrivals during backfill belong to the following incremental pass. */
export function advanceHistorySync(
  previous: HistorySyncPosition | undefined,
  page: Extract<ChatServerEvent, { type: 'history' }>,
): HistorySyncPosition | null {
  if (
    previous &&
    (previous.databaseId !== page.databaseId ||
      previous.visibilityScope !== page.visibilityScope ||
      BigInt(page.head) < BigInt(previous.head ?? previous.after))
  )
    return null;
  const head = previous?.head ?? page.head;
  return page.hasMore
    ? {
        databaseId: page.databaseId,
        visibilityScope: page.visibilityScope,
        after: previous?.after ?? '0',
        head,
        before: page.nextBefore,
      }
    : { databaseId: page.databaseId, visibilityScope: page.visibilityScope, after: head };
}
