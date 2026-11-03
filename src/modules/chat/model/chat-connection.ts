export type ChatConnection =
  | { status: 'idle' | 'connecting' | 'authorizing' | 'online'; error?: never }
  | { status: 'reconnecting'; error?: string }
  | { status: 'error'; error: string };

const ACCESS_ERRORS = new Set([
  'session_revoked',
  'credentials_changed',
  'chat_forbidden',
  'session_changed',
  'unauthenticated',
]);

/** Network recovery preserves context; an explicitly revoked identity never does. */
export function keepChatWorkspace(connection: ChatConnection, hasConnected: boolean): boolean {
  return (
    connection.status === 'online' || (hasConnected && !ACCESS_ERRORS.has(connection.error ?? ''))
  );
}
