import type { ChatConnection } from '../../model/chat-connection';
import type { ChatMessage } from '../../model/chat-protocol';
import { saveHistory } from '../history/chat-history';
import type { ChatHistoryPage, ChatHistoryQuery, ChatSession, ChatSessionEvent, ChatSessionObserver } from './chat-session';
import { postUpdate, type PageCommand, type WorkerUpdate } from './chat-port';

type HostSession = Pick<ChatSession,
  'access' | 'accessDeadline' | 'accessFor' | 'readHistories' | 'send' | 'retry' | 'recover' | 'stop'
>;
type CreateSession = (owner: string, scope: string, observer: ChatSessionObserver) => HostSession;
type PendingRead = {
  result: Promise<ChatHistoryPage>;
  subscribers: number;
  group: { controller: AbortController; remaining: number; unsettled: number };
};
type PortReads = Map<number, () => void>;

function queryKey({ channel, targetUuid, since, page }: ChatHistoryQuery) {
  return JSON.stringify([channel, targetUuid, page ? undefined : since, page]);
}

/** All ports on this worker belong to one verified website login. */
export class SharedChatHost {
  private readonly ports = new Map<MessagePort, PortReads>();
  private readonly reads = new Map<string, PendingRead>();
  private readonly recent = new Map<string, { message: ChatMessage; epoch?: string; write?: Promise<boolean> }>();
  private session?: HostSession;
  private owner?: string;
  private scope?: string;
  private state: ChatConnection = { status: 'idle' };
  private presence?: Extract<ChatSessionEvent, { type: 'presence' }>;

  constructor(private readonly create: CreateSession) {}

  listen(port: MessagePort) {
    port.onmessage = ({ data }: MessageEvent<PageCommand>) => {
      if (data.type === 'attach') {
        if (!this.ports.has(port)) this.attach(port, data.owner, data.scope);
      } else if (this.ports.has(port)) this.command(port, data);
    };
    port.addEventListener('close', () => this.detach(port), { once: true });
    port.onmessageerror = () => this.detach(port);
    port.start();
  }

  private broadcast(update: WorkerUpdate) {
    for (const port of this.ports.keys()) postUpdate(port, update);
  }

  private attach(port: MessagePort, owner: string, scope: string) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(scope) || (this.session && (owner !== this.owner || scope !== this.scope))) {
      postUpdate(port, { type: 'connection', state: { status: 'error', error: 'session_changed' } });
      port.close();
      return;
    }
    this.ports.set(port, new Map());
    if (!this.session) {
      this.owner = owner;
      this.scope = scope;
      this.session = this.create(owner, scope, {
        onConnection: state => { this.state = state; this.broadcast({ type: 'connection', state }); },
        onEvent: event => {
          if (event.type === 'authorized' || event.type === 'permissions')
            this.broadcast({ type: 'lease', deadline: this.session!.accessDeadline });
          if (event.type === 'presence') this.presence = event;
          if (event.type === 'permissions' && !event.staff) {
            // Player visibility is bound to the viewer. Only staff membership depends on this grant.
            if (this.presence) this.presence = { ...this.presence, staffPlayers: [] };
            for (const [id, entry] of this.recent)
              if (entry.message.channel === 'staff') this.recent.delete(id);
          }
          if (event.type === 'closed') this.clearCachedEvents();
          if (event.type === 'message') {
            this.recent.set(event.message.id, { message: event.message });
            if (this.recent.size > 256) this.recent.delete(this.recent.keys().next().value!);
          }
          this.broadcast({ type: 'event', event });
        },
        onDisconnect: () => { this.clearCachedEvents(); this.broadcast({ type: 'disconnect' }); },
        onRefreshAccount: () => this.broadcast({ type: 'refresh' }),
        onDeliveryTimeout: requestId => this.broadcast({ type: 'timeout', requestId }),
        onLease: deadline => this.broadcast({ type: 'lease', deadline }),
      });
      this.session.retry();
      return;
    }
    const access = this.session.access;
    postUpdate(port, { type: 'connection', state: this.state });
    if (access) {
      const deadline = this.session.accessDeadline;
      postUpdate(port, { type: 'lease', deadline });
      postUpdate(port, { type: 'event', event: {
        type: 'authorized', playerUuid: owner, staff: access.staff, validForMs: Math.max(0, deadline - Date.now()),
      } });
      if (this.presence) postUpdate(port, { type: 'event', event: this.presence });
    } else this.session.recover();
  }

  private clearCachedEvents() {
    this.presence = undefined;
    this.recent.clear();
  }

  private command(port: MessagePort, cmd: Exclude<PageCommand, { type: 'attach' }>) {
    const session = this.session!;
    switch (cmd.type) {
      case 'detach': this.detach(port); break;
      case 'retry': session.retry(); break;
      case 'recover': session.recover(); break;
      case 'probe':
        postUpdate(port, { type: 'probe' });
        break;
      case 'cancel': this.ports.get(port)?.get(cmd.id)?.(); break;
      case 'send': {
        const sent = session.send(cmd.destination, cmd.text, cmd.requestId);
        if (!sent.ok) postUpdate(port, { type: 'event', event: {
          type: 'error', requestId: cmd.requestId, error: sent.error ?? 'connection_failed',
        } });
        break;
      }
      case 'read': this.read(port, cmd.id, cmd.queries); break;
      case 'persist':
        void this.persist(cmd.epoch, cmd.messageId).then(
          saved => postUpdate(port, { type: 'stored', id: cmd.id, saved }),
          () => postUpdate(port, { type: 'stored', id: cmd.id, error: 'storage_failed' }),
        );
        break;
    }
  }

  private persist(epoch: string, messageId: string): Promise<boolean | 'evicted'> {
    const entry = this.recent.get(messageId);
    if (!this.session?.access || !this.owner) return Promise.resolve(false);
    if (!entry) return Promise.resolve('evicted');
    if (!this.session.accessFor(entry.message)) return Promise.resolve(false);
    if (!entry.write || entry.epoch !== epoch) {
      entry.epoch = epoch;
      entry.write = saveHistory({ owner: this.owner, epoch, persist: true }, entry.message);
    }
    return entry.write;
  }

  private read(port: MessagePort, id: number, queries: ChatHistoryQuery[]) {
    const pending = this.ports.get(port)!;
    const session = this.session!;
    if (!queries.length || queries.length > 8 || pending.has(id) || pending.size >= 8 || !session.access) {
      queries.forEach((_, index) => postUpdate(port, { type: 'page', id, index, error: 'history_unavailable' }));
      return;
    }
    const missing = new Map<string, ChatHistoryQuery>();
    for (const query of queries) {
      const key = queryKey(query);
      if (!this.reads.has(key)) missing.set(key, query);
    }
    const group = { controller: new AbortController(), remaining: missing.size, unsettled: missing.size };
    const fresh = missing.size ? session.readHistories([...missing.values()], group.controller.signal) : [];
    [...missing.keys()].forEach((key, i) => {
      const read = { result: fresh[i], subscribers: 0, group };
      this.reads.set(key, read);
      const finish = () => {
        group.unsettled--;
        if (this.reads.get(key) === read) this.reads.delete(key);
      };
      void read.result.then(finish, finish);
    });
    const subscriptions = queries.map(q => {
      const key = queryKey(q);
      const read = this.reads.get(key)!;
      read.subscribers++;
      return { read, key, active: true };
    });
    const release = (sub: (typeof subscriptions)[number]) => {
      if (!sub.active) return;
      sub.active = false;
      if (--sub.read.subscribers === 0) {
        if (this.reads.get(sub.key) === sub.read) this.reads.delete(sub.key);
        if (--sub.read.group.remaining === 0 && sub.read.group.unsettled > 0) sub.read.group.controller.abort();
      }
      if (subscriptions.every(s => !s.active)) pending.delete(id);
    };
    pending.set(id, () => subscriptions.forEach(release));
    subscriptions.forEach((sub, index) => {
      const settle = (page?: ChatHistoryPage, error?: string) => {
        if (!sub.active) return;
        const access = session.access;
        if (!access || (queries[index].channel === 'staff' && !access.staff)) {
          page = undefined;
          error = 'history_unavailable';
        }
        postUpdate(port, { type: 'page', id, index, page, error });
        release(sub);
      };
      void sub.read.result.then(page => settle(page), err => settle(undefined, err instanceof Error ? err.message : 'history_unavailable'));
    });
  }

  private detach(port: MessagePort) {
    const pending = this.ports.get(port);
    if (!pending) return;
    this.ports.delete(port);
    for (const cancel of pending.values()) cancel();
    port.onmessage = null;
    port.close();
    if (this.ports.size) return;
    this.session?.stop();
    this.session = undefined;
    this.clearCachedEvents();
    this.reads.clear();
    this.state = { status: 'idle' };
  }
}
