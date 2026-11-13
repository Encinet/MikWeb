import type { HistorySyncPosition } from './chat-history-sync';
import { advanceHistorySync } from './chat-history-sync';
import type { ChatMessage, ChatServerEvent } from './chat-protocol';

type Page = Extract<ChatServerEvent, { type: 'history' }>;
export interface HistoryRunnerPorts {
  position?: HistorySyncPosition;
  current(): boolean;
  read(position?: HistorySyncPosition): Promise<Page>;
  accept(page: Page): ChatMessage[];
  commit(
    records: ChatMessage[],
    expected: HistorySyncPosition | undefined,
    next: HistorySyncPosition,
  ): Promise<'saved' | 'stale' | 'forbidden' | 'conflict'>;
  reload(): Promise<HistorySyncPosition | undefined>;
  advanced(position: HistorySyncPosition): void;
  state(loading: boolean, failed?: boolean, count?: number): void;
  stale(): void;
}
export class ChatHistoryRunner {
  constructor(private readonly ports: HistoryRunnerPorts) {}
  async run() {
    const p = this.ports;
    let position = p.position;
    let count = 0;
    p.state(true, false, count);
    try {
      while (p.current()) {
        const page = await p.read(position);
        if (!p.current()) return;
        const next = advanceHistorySync(position, page);
        const records = p.accept(page);
        const saved = await p.commit(records, position, next);
        if (!p.current()) return;
        if (saved === 'stale') {
          p.state(false, false, count);
          p.stale();
          return;
        }
        if (saved === 'forbidden') {
          p.state(false, true, count);
          return;
        }
        if (saved === 'conflict') {
          position = await p.reload();
          continue;
        }
        position = next;
        p.advanced(next);
        count += records.length;
        p.state(Boolean(page.nextPage), false, count);
        if (!page.nextPage) return;
      }
    } catch {
      if (p.current()) p.state(false, true, count);
    }
  }
}
