/** The stored format cannot be read or upgraded without losing data. */
export class UnsupportedChatHistoryError extends Error {
  constructor() {
    super('unsupported_chat_history');
    this.name = 'UnsupportedChatHistoryError';
  }
}

export type ChatHistoryRecovery = 'required' | 'deleting' | 'blocked' | 'failed';
