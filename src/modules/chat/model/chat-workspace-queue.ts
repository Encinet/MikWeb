import { destinationKey } from '@/modules/chat/model/chat-destination';
import type { ChatPreferences, ChatWorkspaceMutation } from '@/modules/chat/model/chat-workspace';

function mutationKey(mutation: ChatWorkspaceMutation): string {
  if (mutation.type === 'preferences') return 'preferences';
  if (mutation.type === 'draft') return `draft:${mutation.key}`;
  return `${mutation.type}:${destinationKey(mutation.destination)}`;
}

/** Coalesce waiting writes, preserving the order of independent fields and thread operations. */
export function appendWorkspaceMutation(
  pending: readonly ChatWorkspaceMutation[],
  mutation: ChatWorkspaceMutation,
): ChatWorkspaceMutation[] {
  const key = mutationKey(mutation);
  const preferences: Partial<ChatPreferences> = {};
  const retained = pending.filter((previous) => {
    if (mutationKey(previous) !== key) return true;
    if (previous.type === 'preferences') Object.assign(preferences, previous.value);
    return false;
  });
  return [
    ...retained,
    mutation.type === 'preferences'
      ? { type: 'preferences', value: { ...preferences, ...mutation.value } }
      : mutation,
  ];
}
