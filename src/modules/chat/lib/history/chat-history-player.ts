import type { ChatMessage } from '@/modules/chat/model/chat-protocol';
import { messageDestination } from '@/modules/chat/model/chat-protocol';

/** Each record belongs to at most one player; outgoing private messages belong to the peer. */
export function historyMessagePlayer(message: ChatMessage, owner: string) {
  if (message.channel === 'private') {
    const destination = messageDestination(message, owner);
    if (destination?.channel === 'private')
      return { uuid: destination.targetUuid, name: destination.name };
    return null;
  }
  if (message.kind === 'server')
    return message.subject
      ? { uuid: message.subject.playerUuid, name: message.subject.name }
      : null;
  return message.sender.playerUuid
    ? { uuid: message.sender.playerUuid, name: message.sender.playerName ?? message.sender.name }
    : null;
}
