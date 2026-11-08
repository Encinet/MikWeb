import type { ChatMessage } from '@/modules/chat/model/chat-protocol';
import { messageConversation } from '@/modules/chat/model/chat-protocol';

export interface ChatSearchCriteria {
  query: string;
  scope: 'current' | 'all';
  author: string;
  source: 'all' | 'game' | 'web' | 'social';
  after: string;
  before: string;
  mentionsOnly: boolean;
}

export function emptyChatSearch(
  scope: ChatSearchCriteria['scope'] = 'current',
): ChatSearchCriteria {
  return {
    query: '',
    scope,
    author: '',
    source: 'all',
    after: '',
    before: '',
    mentionsOnly: false,
  };
}

export function chatSearchFilterCount(criteria: ChatSearchCriteria) {
  return (
    Number(Boolean(criteria.author)) +
    Number(criteria.source !== 'all') +
    Number(Boolean(criteria.after)) +
    Number(Boolean(criteria.before)) +
    Number(criteria.mentionsOnly)
  );
}

/** Date inputs use local calendar days; the end day includes the whole day, including DST changes. */
function dayBoundary(value: string, nextDay = false): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return Number.NaN;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day)
    return Number.NaN;
  if (nextDay) date.setDate(date.getDate() + 1);
  return date.getTime();
}

export function matchesChatSearch(
  message: ChatMessage,
  text: string,
  name: string,
  criteria: ChatSearchCriteria,
  owner: string,
  conversation: string,
): boolean {
  if (
    criteria.mentionsOnly &&
    (message.kind !== 'user' || !message.mentioned || message.sender.playerUuid === owner)
  )
    return false;
  if (criteria.scope === 'current' && messageConversation(message, owner) !== conversation)
    return false;
  if (criteria.author && (message.kind !== 'user' || message.sender.id !== criteria.author))
    return false;
  if (
    criteria.source !== 'all' &&
    (message.kind !== 'user' || message.source.kind !== criteria.source)
  )
    return false;
  if (criteria.after && !(message.createdAt >= dayBoundary(criteria.after))) return false;
  if (criteria.before && !(message.createdAt < dayBoundary(criteria.before, true))) return false;
  const needle = criteria.query.trim().toLowerCase();
  return !needle || text.toLowerCase().includes(needle) || name.toLowerCase().includes(needle);
}
