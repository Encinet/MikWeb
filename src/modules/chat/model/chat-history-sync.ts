import { z } from 'zod';
import type { ChatServerEvent } from '@/modules/chat/model/chat-protocol';
import { historyToken } from '@/modules/chat/model/chat-protocol';
export type HistoryChannel = 'public' | 'staff' | 'private';
const positionSchema = z.strictObject({
  checkpoint: historyToken.optional(),
  page: historyToken.optional(),
});
export type HistorySyncPosition = z.infer<typeof positionSchema>;
export type HistorySyncPositions = Partial<Record<HistoryChannel, HistorySyncPosition>>;
export function readHistorySyncPositions(value: unknown): HistorySyncPositions {
  const parsed = z
    .object({
      public: positionSchema.optional(),
      private: positionSchema.optional(),
      staff: positionSchema.optional(),
    })
    .safeParse(value);
  return parsed.success ? parsed.data : {};
}
export function advanceHistorySync(
  previous: HistorySyncPosition | undefined,
  page: Extract<ChatServerEvent, { type: 'history' }>,
): HistorySyncPosition {
  return page.nextPage
    ? {
        ...(page.reset ? {} : previous?.checkpoint ? { checkpoint: previous.checkpoint } : {}),
        page: page.nextPage,
      }
    : { checkpoint: page.checkpoint };
}
