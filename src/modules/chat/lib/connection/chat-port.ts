import type { HistoryLease } from '../history/chat-history';
import type { ChatConnection } from '../../model/chat-connection';
import type { ChatDestination } from '../../model/chat-destination';
import type { ChatMessage } from '../../model/chat-protocol';
import type { ChatHistoryPage, ChatHistoryQuery, ChatSession, ChatSessionEvent } from './chat-session';

export type PageChatSession = Pick<ChatSession,
  'accessFor' | 'hasConnection' | 'hasHistory' | 'readHistory' | 'readHistories' |
  'send' | 'retry' | 'recover' | 'stop'
> & { persistLive?(lease: HistoryLease, message: ChatMessage): Promise<boolean> };

export type PageCommand =
  | { type: 'attach'; owner: string; scope: string }
  | { type: 'retry' | 'recover' | 'detach' }
  | { type: 'send'; destination: ChatDestination; text: string; requestId: string }
  | { type: 'read'; id: number; queries: ChatHistoryQuery[] }
  | { type: 'cancel'; id: number }
  | { type: 'persist'; id: number; epoch: string; messageId: string };

export type WorkerUpdate =
  | { type: 'connection'; state: ChatConnection }
  | { type: 'event'; event: ChatSessionEvent }
  | { type: 'disconnect' | 'refresh' }
  | { type: 'lease'; deadline: number }
  | { type: 'timeout'; requestId: string }
  | { type: 'page'; id: number; index: number; page?: ChatHistoryPage; error?: string }
  | { type: 'stored'; id: number; saved?: boolean | 'evicted'; error?: string };

export function postUpdate(port: MessagePort, update: WorkerUpdate) {
  port.postMessage(update);
}
