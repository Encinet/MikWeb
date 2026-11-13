import type { ChatMessage } from '../../model/chat-protocol';
import type { ChatSearchCriteria } from '../../model/chat-search';
import { matchesChatSearch } from '../../model/chat-search';
import type { HistoryLease } from './chat-history';
import { readHistoryBatch } from './chat-history';
export interface HistorySearchQuery {
  lease: HistoryLease;
  criteria: ChatSearchCriteria;
  conversation: string;
  staff: boolean;
  templates: Record<string, string>;
  before?: string;
}
export interface HistorySearchPage {
  messages: ChatMessage[];
  before?: string;
  hasMore: boolean;
}
export async function searchChatHistory(
  query: HistorySearchQuery,
  current: () => boolean = () => true,
): Promise<HistorySearchPage> {
  const result: HistorySearchPage = { messages: [], hasMore: false };
  let before = query.before;
  while (current()) {
    const batch = await readHistoryBatch(query.lease, before);
    if (!current()) break;
    const records = [...batch.messages].reverse();
    for (let i = 0; i < records.length; i++) {
      const message = records[i];
      if (message.channel === 'staff' && !query.staff) continue;
      const content = message.content;
      const text = Array.isArray(content)
        ? content.map((part) => part.text).join('')
        : (query.templates[content.template] ?? '').replaceAll(
            '__MIK_CHAT_NAME__',
            content.values.name,
          );
      const name = message.kind === 'user' ? message.sender.name : (message.subject?.name ?? '');
      if (
        matchesChatSearch(
          message,
          text,
          name,
          query.criteria,
          query.lease.owner ?? '',
          query.conversation,
        )
      )
        result.messages.push(message);
      if (result.messages.length === 30)
        return {
          ...result,
          before: message.order,
          hasMore: i < records.length - 1 || batch.hasMore,
        };
    }
    if (!batch.hasMore) return result;
    before = batch.messages[0]?.order;
    if (!before) return result;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  return { messages: [], hasMore: false };
}
