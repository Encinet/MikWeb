import { CHAT_PROTOCOL_VERSION } from '@/shared/config/service-config';
import { saveHistory, type HistoryLease } from '../history/chat-history';
import type { ChatConnection } from '../../model/chat-connection';
import type { ChatDestination } from '../../model/chat-destination';
import type { ChatSendResult } from '../../model/chat-delivery';
import { isValidChatInput, mayReadMessage, type ChatAccess, type ChatMessage } from '../../model/chat-protocol';
import { browserChatEnvironment, ChatSession, type ChatHistoryPage, type ChatHistoryQuery, type ChatSessionObserver } from './chat-session';
import type { PageChatSession, PageCommand, WorkerUpdate } from './chat-port';

type PageResult = ReturnType<typeof Promise.withResolvers<ChatHistoryPage>>;

export function createPageChat(owner: string, scope: string | undefined, observer: ChatSessionObserver): PageChatSession {
  if (!scope || typeof SharedWorker === 'undefined') return new ChatSession(owner, observer, browserChatEnvironment(scope));
  return new SharedPageChat(owner, scope, observer);
}

class SharedPageChat implements PageChatSession {
  private worker?: SharedWorker;
  private wanted = false;
  private generation = 0;
  private serial = 0;
  private deadline = 0;
  private staff?: boolean;
  private state: ChatConnection = { status: 'idle' };
  private readonly reads = new Map<number, { results: PageResult[]; pending: Set<number>; cleanup: () => void }>();
  private readonly writes = new Map<number, ReturnType<typeof Promise.withResolvers<boolean | 'evicted'>>>();

  constructor(private readonly owner: string, private readonly scope: string, private readonly observer: ChatSessionObserver) {}

  get hasConnection() { return !!this.worker && this.state.status !== 'idle' && this.state.status !== 'error'; }
  get hasHistory() { return this.access !== null; }
  private get access(): ChatAccess | null {
    return this.wanted && this.state.status === 'online' && this.staff !== undefined && Date.now() < this.deadline
      ? { owner: this.owner, staff: this.staff } : null;
  }

  accessFor(message: ChatMessage) {
    const access = this.access;
    return access && mayReadMessage(message, this.owner, access.staff) ? access : null;
  }

  private post(command: PageCommand) { this.worker!.port.postMessage(command); }

  retry() {
    if (!this.wanted) {
      this.wanted = true;
      window.addEventListener('pagehide', this.hide);
      window.addEventListener('pageshow', this.restore);
    }
    if (this.worker) this.post({ type: 'retry' });
    else this.connect();
  }

  recover() {
    if (!this.wanted) return;
    if (this.worker) this.post({ type: 'recover' });
    else this.connect();
  }

  private readonly hide = () => this.release();
  private readonly restore = () => this.recover();

  private connect() {
    try {
      const worker = new SharedWorker(new URL('../../worker/chat-session.worker.ts', import.meta.url),
        { type: 'module', name: `mik-webchat-${CHAT_PROTOCOL_VERSION}-${this.scope}` });
      this.worker = worker;
      worker.onerror = () => this.failed(worker);
      worker.port.onmessageerror = () => this.failed(worker);
      worker.port.addEventListener('close', () => this.failed(worker), { once: true });
      worker.port.onmessage = ({ data }: MessageEvent<WorkerUpdate>) => {
        if (this.worker === worker) this.receive(data);
      };
      this.post({ type: 'attach', owner: this.owner, scope: this.scope });
    } catch {
      this.release();
      this.connection({ status: 'error', error: 'connection_failed' });
    }
  }

  private failed(worker: SharedWorker) {
    if (this.worker !== worker) return;
    this.release();
    this.connection({ status: 'error', error: 'connection_failed' });
  }

  private connection(state: ChatConnection) {
    this.state = state;
    this.observer.onConnection(state);
  }

  private reset() {
    this.generation++;
    this.deadline = 0;
    this.staff = undefined;
    for (const { results, cleanup } of this.reads.values()) {
      cleanup();
      for (const r of results) r.reject(new Error('history_unavailable'));
    }
    this.reads.clear();
    for (const write of this.writes.values()) write.resolve(false);
    this.writes.clear();
  }

  private release() {
    if (this.worker) {
      this.post({ type: 'detach' });
      this.worker.port.close();
      this.worker = undefined;
      this.reset();
      this.observer.onDisconnect();
    }
    this.connection({ status: 'idle' });
  }

  stop() {
    this.wanted = false;
    window.removeEventListener('pagehide', this.hide);
    window.removeEventListener('pageshow', this.restore);
    this.release();
  }

  private receive(update: WorkerUpdate) {
    switch (update.type) {
      case 'connection': this.connection(update.state); break;
      case 'disconnect': this.reset(); this.observer.onDisconnect(); break;
      case 'refresh': this.observer.onRefreshAccount(); break;
      case 'lease': this.deadline = update.deadline; this.observer.onLease?.(update.deadline); break;
      case 'timeout': this.observer.onDeliveryTimeout(update.requestId); break;
      case 'event': {
        const event = update.event;
        if (event.type === 'authorized' || event.type === 'permissions') this.staff = event.staff;
        if (event.type === 'closed') this.staff = undefined;
        if (event.type === 'message' && !this.accessFor(event.message)) return;
        if ((event.type === 'authorized' || event.type === 'presence' || event.type === 'checkpoint') && !this.access) return;
        const generation = this.generation;
        this.observer.onEvent(event, () => this.wanted && this.generation === generation);
        break;
      }
      case 'page': {
        const read = this.reads.get(update.id);
        if (!read || !read.pending.delete(update.index)) break;
        const result = read.results[update.index];
        const page = update.page;
        if (page && this.access && (page.channel !== 'staff' || this.staff) && page.messages.every(m => this.accessFor(m))) result.resolve(page);
        else result.reject(new Error(update.error ?? 'history_unavailable'));
        if (!read.pending.size) { read.cleanup(); this.reads.delete(update.id); }
        break;
      }
      case 'stored': {
        const write = this.writes.get(update.id);
        this.writes.delete(update.id);
        if (update.error) write?.reject(new Error(update.error));
        else write?.resolve(update.saved ?? false);
        break;
      }
    }
  }

  send(destination: ChatDestination, text: string, retryId?: string): ChatSendResult {
    const value = text.trim();
    if (!this.access || !value) return { ok: false };
    if (!isValidChatInput(value)) return { ok: false, error: 'invalid_message' };
    if (destination.channel === 'staff' && !this.staff) return { ok: false, error: 'staff_required' };
    const requestId = retryId ?? crypto.randomUUID();
    this.post({ type: 'send', destination, text: value, requestId });
    return { ok: true, requestId, text: value };
  }

  readHistory(query: ChatHistoryQuery, signal?: AbortSignal) { return this.readHistories([query], signal)[0]; }

  readHistories(queries: ChatHistoryQuery[], signal?: AbortSignal): Promise<ChatHistoryPage>[] {
    if (!queries.length) return [];
    if (!this.access || signal?.aborted || this.reads.size >= 8 || queries.length > 8)
      return queries.map(() => Promise.reject(new Error('history_unavailable')));
    const id = ++this.serial;
    const results = queries.map(() => Promise.withResolvers<ChatHistoryPage>());
    const cancel = () => {
      if (!this.reads.delete(id)) return;
      for (const result of results) result.reject(new Error('history_unavailable'));
      if (this.worker) this.post({ type: 'cancel', id });
    };
    this.reads.set(id, {
      results, pending: new Set(queries.map((_, i) => i)),
      cleanup: () => signal?.removeEventListener('abort', cancel),
    });
    signal?.addEventListener('abort', cancel, { once: true });
    this.post({ type: 'read', id, queries });
    return results.map(r => r.promise);
  }

  persistLive(lease: HistoryLease, message: ChatMessage): Promise<boolean> {
    if (lease.owner !== this.owner || !lease.persist || !this.accessFor(message) || this.writes.size >= 256) return Promise.resolve(false);
    const id = ++this.serial;
    const write = Promise.withResolvers<boolean | 'evicted'>();
    this.writes.set(id, write);
    this.post({ type: 'persist', id, epoch: lease.epoch, messageId: message.id });
    return write.promise.then(saved => {
      // A suspended tab can outlive the worker's bounded cache of recent messages.
      if (saved === 'evicted') return this.accessFor(message) ? saveHistory(lease, message) : false;
      return saved;
    });
  }
}
