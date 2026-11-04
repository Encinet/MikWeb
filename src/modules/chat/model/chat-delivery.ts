import type { ChatDestination } from '@/modules/chat/model/chat-destination';
import type { ChatMessage } from '@/modules/chat/model/chat-protocol';

export interface PendingChatMessage {
  requestId: string;
  destination: ChatDestination;
  text: string;
  createdAt: number;
  status: 'sending' | 'accepted' | 'unknown' | 'failed';
  messageId?: string;
  error?: string;
}

export type ChatSendResult =
  | { ok: true; requestId: string; text: string }
  | { ok: false; error?: string };

/** An acknowledgement changes delivery state; the local line stays until its full record arrives. */
export function acceptChatDelivery(
  pending: PendingChatMessage[],
  requestId: string,
  messageId: string,
): PendingChatMessage[] {
  const index = pending.findIndex((message) => message.requestId === requestId);
  if (index < 0) return pending;
  const message = pending[index];
  if (message.status === 'accepted' && message.messageId === messageId && !message.error)
    return pending;
  const next = [...pending];
  next[index] = { ...message, status: 'accepted', messageId, error: undefined };
  return next;
}

export function unconfirmedChatDeliveries(
  pending: PendingChatMessage[],
  messages: ChatMessage[],
  owner: string,
): PendingChatMessage[] {
  if (!pending.length) return pending;
  const ids = new Set<string>();
  const requests = new Set<string>();
  for (const message of messages) {
    if (message.kind !== 'player' || message.senderUuid !== owner) continue;
    ids.add(message.id);
    if (message.requestId) requests.add(message.requestId);
  }
  const next = pending.filter(
    (message) =>
      !requests.has(message.requestId) && (!message.messageId || !ids.has(message.messageId)),
  );
  return next.length === pending.length ? pending : next;
}
