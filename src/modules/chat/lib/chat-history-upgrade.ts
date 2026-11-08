import { UnsupportedChatHistoryError } from '@/modules/chat/model/chat-history-compatibility';
import { chatMessageSchema } from '@/modules/chat/model/chat-protocol';

/** One-time storage conversion; live traffic only accepts the current protocol. */
export function upgradeChatHistoryMessage(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new UnsupportedChatHistoryError();
  const record = value as Record<string, unknown>;
  if (record.kind !== 'player') {
    const parsed = chatMessageSchema.safeParse(record);
    if (!parsed.success) throw new UnsupportedChatHistoryError();
    return parsed.data;
  }
  const { senderUuid, senderName, source, ...message } = record;
  const converted = chatMessageSchema.safeParse({
    ...message,
    kind: 'user',
    sender: {
      id: senderUuid,
      playerUuid: senderUuid,
      playerName: senderName,
      name: senderName,
    },
    source: { kind: source },
  });
  if (!converted.success) throw new UnsupportedChatHistoryError();
  return converted.data;
}
