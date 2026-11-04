import type { PendingChatMessage } from '@/modules/chat/model/chat-delivery';
import { unconfirmedChatDeliveries } from '@/modules/chat/model/chat-delivery';
import type { ChatMessage } from '@/modules/chat/model/chat-protocol';
import { isPassiveMessage } from '@/modules/chat/model/chat-protocol';

export interface ChatPendingEntry extends PendingChatMessage {
  kind: 'pending';
  id: string;
  senderUuid: string;
  senderName: string;
  source: 'web';
}

export type ChatTimelineEntry = ChatMessage | ChatPendingEntry;

export function chatDayKey(timestamp: number) {
  const date = new Date(timestamp);
  return [date.getFullYear(), date.getMonth(), date.getDate()].join('-');
}

/** Preserve the line identity when a local send is confirmed or changes author groups. */
export function chatTimelineKey(message: ChatTimelineEntry, owner: string): string {
  return message.kind === 'pending' ||
    (message.kind === 'player' && message.senderUuid === owner && message.requestId)
    ? `request:${message.requestId}`
    : `message:${message.id}`;
}

/** Confirmed messages keep server cursor order; local sends remain provisional at the end. */
export function chatTimelineGroups(
  messages: ChatMessage[],
  pending: PendingChatMessage[],
  owner: string,
  name: string,
  start: number,
  boundary?: string,
): ChatTimelineEntry[][] {
  const entries: ChatTimelineEntry[] = [
    ...messages.slice(start),
    ...unconfirmedChatDeliveries(pending, messages, owner).map(
      (message): ChatPendingEntry => ({
        ...message,
        kind: 'pending',
        id: `request:${message.requestId}`,
        senderUuid: owner,
        senderName: name,
        source: 'web',
      }),
    ),
  ];
  const groups: ChatTimelineEntry[][] = [];
  for (const message of entries) {
    const last = groups.at(-1)?.at(-1);
    const sameAuthor =
      last &&
      last.kind !== 'server' &&
      message.kind !== 'server' &&
      last.senderUuid === message.senderUuid &&
      last.source === message.source &&
      Math.abs(message.createdAt - last.createdAt) < 180_000;
    const sameActivity =
      last?.kind === 'server' &&
      message.kind === 'server' &&
      isPassiveMessage(last) &&
      isPassiveMessage(message);
    if (
      last &&
      message.id !== boundary &&
      (sameAuthor || sameActivity) &&
      chatDayKey(last.createdAt) === chatDayKey(message.createdAt)
    )
      groups.at(-1)?.push(message);
    else groups.push([message]);
  }
  return groups;
}
