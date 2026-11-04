import type { ChatDestination } from '@/modules/chat/model/chat-destination';

export interface PendingChatMessage {
  requestId: string;
  destination: ChatDestination;
  text: string;
  status: 'sending' | 'unknown' | 'failed';
  error?: string;
}

export type ChatSendResult =
  | { ok: true; requestId: string; text: string }
  | { ok: false; error?: string };
