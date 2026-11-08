import type { ChatMessage } from '@/modules/chat/model/chat-protocol';
import { isValidChatInput, messageConversation } from '@/modules/chat/model/chat-protocol';

export interface ChatInputHistoryEntry {
  id: string;
  text: string;
}

const INPUT_HISTORY_LIMIT = 100;

/** Reuse authorized conversation records instead of keeping a second persistent message store. */
export function chatInputHistory(
  messages: ChatMessage[],
  owner: string,
  conversation: string,
): ChatInputHistoryEntry[] {
  const entries: ChatInputHistoryEntry[] = [];
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index];
    if (
      message.kind !== 'user' ||
      message.sender.playerUuid !== owner ||
      messageConversation(message, owner) !== conversation
    )
      continue;
    const text = message.content
      .map((part) => part.text)
      .join('')
      .trim();
    if (!isValidChatInput(text)) continue;
    entries.push({ id: message.id, text });
    if (entries.length === INPUT_HISTORY_LIMIT) break;
  }
  return entries.reverse();
}
