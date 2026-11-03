import type { ChatConnection } from '@/modules/chat/model/chat-connection';
import type { ChatDestination } from '@/modules/chat/model/chat-destination';

interface ChatFeedbackContext {
  connection: ChatConnection;
  error: string | null;
  channel: ChatDestination['channel'];
  recipientOnline: boolean;
  staff: boolean;
}

interface ChatWorkspaceFeedback {
  error: string | null;
  composeHint: 'privateOffline' | 'staffUnavailable' | null;
}

/** Each cause is explained by its connection notice, composer hint, or action error once. */
export function chatWorkspaceFeedback({
  connection,
  error,
  channel,
  recipientOnline,
  staff,
}: ChatFeedbackContext): ChatWorkspaceFeedback {
  const composeHint =
    connection.status !== 'online'
      ? null
      : channel === 'private' && !recipientOnline
        ? 'privateOffline'
        : channel === 'staff' && !staff
          ? 'staffUnavailable'
          : null;
  const hintError =
    composeHint === 'privateOffline'
      ? 'recipient_unavailable'
      : composeHint === 'staffUnavailable'
        ? 'staff_required'
        : null;
  return {
    error: error === connection.error || error === hintError ? null : error,
    composeHint,
  };
}
