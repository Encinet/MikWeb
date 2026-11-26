import type { ChatAuthorizationResult } from '@/modules/chat/lib/connection/chat-authorization';
import { authorizeChat } from '@/modules/chat/lib/connection/chat-authorization';
import { ChatTransport, UnconfiguredChatTransport, UnsupportedChatTransport } from '@/modules/chat/lib/connection/chat-transport';
import type { ChatConnection } from '@/modules/chat/model/chat-connection';
import { isTerminalChatClose } from '@/modules/chat/model/chat-connection';
import type { ChatSendResult } from '@/modules/chat/model/chat-delivery';
import type { ChatDestination } from '@/modules/chat/model/chat-destination';
import type {
  ChatAccess,
  ChatMessage,
  ChatPresence,
  ChatServerEvent,
} from '@/modules/chat/model/chat-protocol';
import {
  chatServerEventSchema,
  isValidChatInput,
  mayReadMessage,
} from '@/modules/chat/model/chat-protocol';

import { ChatHistoryRequests, type ChatHistoryQuery, type ChatHistoryPage } from './chat-history-requests';
export type { ChatHistoryQuery, ChatHistoryPage } from './chat-history-requests';

export type ChatSessionEvent = { type: 'permissions'; staff: boolean } | Exclude<
  ChatServerEvent,
  { type: 'hello' | 'presenceDelta' | 'history' | 'historyCurrent' | 'receipts' | 'lease' }
>;
export type ChatSessionTransport = Pick<
  ChatTransport,
  | 'onmessage'
  | 'onclose'
  | 'onerror'
  | 'readyState'
  | 'bufferedAmount'
  | 'authorizationKey'
  | 'send'
  | 'history'
  | 'close'
>;

export interface ChatSessionObserver {
  onLease?: (deadline: number) => void;
  onConnection: (connection: ChatConnection) => void;
  onEvent: (event: ChatSessionEvent, current: () => boolean) => void;
  onDisconnect: () => void;
  onDeliveryTimeout: (requestId: string) => void;
  onRefreshAccount: () => void;
}

export interface ChatSessionEnvironment {
  createTransport: () => ChatSessionTransport;
  authorize: (
    connectionId: string,
    clientPublicKey: string,
    signal: AbortSignal,
  ) => Promise<ChatAuthorizationResult>;
  now: () => number;
  schedule: (callback: () => void, delay: number) => () => void;
}

export function browserChatEnvironment(chatScope?: string): ChatSessionEnvironment {
  return {
    createTransport: () => new ChatTransport(),
    authorize: (id, key, signal) => authorizeChat(id, key, signal, chatScope),
    now: () => Date.now(),
    schedule: (callback, delay) => {
      const timer = setTimeout(callback, delay);
      return () => clearTimeout(timer);
    },
  };
}

interface UnconfirmedDelivery {
  channel: ChatDestination['channel'];
}

interface Connection {
  transport: ChatSessionTransport;
  generation: number;
  id: string;
  confirmed: boolean;
  history: ChatHistoryRequests;
  queriedReceipts?: Map<string, UnconfirmedDelivery>;
  receiptRetries: number;
  cancelReceiptRetry?: () => void;
  staff: boolean;
  deadline: number;
  cancelExpiry?: () => void;
  authorizing?: { controller: AbortController; cancelTimeout: () => void };
}

/** Owns connection authority, retries and delivery deadlines; React and storage consume its events. */
export class ChatSession {
  private connection: Connection | null = null;
  private state: ChatConnection = { status: 'idle' };
  private presence: ChatPresence = { players: [], staffPlayers: [] };
  private presenceRevision = 0;
  private generation = 0;
  private wanted = false;
  private attempts = 0;
  private cancelReconnect?: () => void;
  private deliveries = new Map<string, () => void>();
  // Only IDs and channel permissions survive a disconnect. Message bodies stay in the originating UI.
  private unconfirmed = new Map<string, UnconfirmedDelivery>();

  constructor(
    private readonly owner: string,
    private readonly observer: ChatSessionObserver,
    private readonly environment: ChatSessionEnvironment = browserChatEnvironment(),
  ) {}

  get hasConnection(): boolean {
    return this.connection !== null;
  }

  get hasHistory(): boolean {
    return Boolean(this.access);
  }

  get accessDeadline(): number {
    return this.access ? this.connection!.deadline : 0;
  }

  readHistory(query: ChatHistoryQuery, signal?: AbortSignal): Promise<ChatHistoryPage> {
    return this.readHistories([query], signal)[0];
  }

  readHistories(queries: ChatHistoryQuery[], signal?: AbortSignal): Promise<ChatHistoryPage>[] {
    return this.connection?.history.read(queries, signal) ??
      queries.map(() => Promise.reject(new Error('history_unavailable')));
  }

  get access(): ChatAccess | null {
    const connection = this.connection;
    return this.wanted &&
      this.state.status === 'online' &&
      connection?.confirmed &&
      this.environment.now() < connection.deadline &&
      connection.transport.readyState === 'open'
      ? { owner: this.owner, staff: connection.staff }
      : null;
  }

  /** Async notification work must recheck the original message against the current permissions. */
  accessFor(message: ChatMessage): ChatAccess | null {
    const access = this.access;
    return access && mayReadMessage(message, this.owner, access.staff) ? access : null;
  }

  retry(): void {
    if (this.connection && this.wanted) return;
    this.wanted = true;
    this.attempts = 0;
    if (!this.connection) this.dial();
  }

  recover(): void {
    if (!this.wanted) return;
    const connection = this.connection;
    if (
      connection &&
      (connection.transport.readyState === 'open' ||
        connection.transport.readyState === 'connecting') &&
      this.environment.now() < connection.deadline
    )
      return;
    this.dial();
  }

  stop(): void {
    this.wanted = false;
    this.unconfirmed.clear();
    this.generation++;
    this.cancelReconnect?.();
    this.cancelReconnect = undefined;
    this.release();
    this.update({ status: 'idle' });
  }

  send(destination: ChatDestination, text: string, retryId?: string): ChatSendResult {
    const connection = this.connection;
    const value = text.trim();
    const access = this.access;
    if (!connection || !access || !value) return { ok: false };
    if (!isValidChatInput(value)) return { ok: false, error: 'invalid_message' };
    if (destination.channel === 'staff' && !access.staff)
      return { ok: false, error: 'staff_required' };
    if (
      destination.channel === 'private' &&
      !this.presence.players.some((peer) => peer.playerUuid === destination.targetUuid)
    )
      return { ok: false, error: 'recipient_unavailable' };
    if (connection.transport.bufferedAmount > 16 * 1024) return { ok: false, error: 'chat_busy' };
    const requestId = retryId ?? crypto.randomUUID();
    try {
      connection.transport.send({
        type: 'send',
        requestId,
        text: value,
        channel: destination.channel,
        ...(destination.channel === 'private' ? { targetUuid: destination.targetUuid } : {}),
      });
    } catch {
      this.update({ status: 'reconnecting', error: 'connection_failed' });
      connection.transport.close();
      return { ok: false };
    }
    if (this.unconfirmed.size >= 20 && !this.unconfirmed.has(requestId)) {
      const oldest = this.unconfirmed.keys().next().value!;
      this.finishDelivery(oldest);
      this.observer.onDeliveryTimeout(oldest);
    }
    this.unconfirmed.set(requestId, { channel: destination.channel });
    this.deliveries.get(requestId)?.();
    this.deliveries.set(
      requestId,
      this.environment.schedule(() => {
        this.deliveries.delete(requestId);
        if (this.current(connection)) this.observer.onDeliveryTimeout(requestId);
      }, 10_000),
    );
    return { ok: true, requestId, text: value };
  }

  private update(state: ChatConnection): void {
    this.state = state;
    this.observer.onConnection(state);
  }

  private current(connection: Connection): boolean {
    return this.generation === connection.generation && this.connection === connection;
  }

  private release(): void {
    const previous = this.connection;
    this.connection = null;
    this.presenceRevision = 0;
    this.presence = { players: [], staffPlayers: [] };
    for (const cancel of this.deliveries.values()) cancel();
    this.deliveries.clear();
    if (!previous) return;
    previous.history.close();
    previous.cancelReceiptRetry?.();
    previous.cancelExpiry?.();
    previous.authorizing?.cancelTimeout();
    previous.authorizing?.controller.abort();
    previous.transport.onmessage = null;
    previous.transport.onclose = null;
    previous.transport.onerror = null;
    previous.transport.close();
    this.observer.onDisconnect();
  }

  private expire(connection: Connection, delay: number): void {
    connection.cancelExpiry?.();
    connection.deadline = this.environment.now() + delay;
    connection.cancelExpiry = this.environment.schedule(() => {
      if (this.current(connection)) connection.transport.close();
    }, delay);
  }

  private fail(connection: Connection, error: string): void {
    this.wanted = false;
    this.update({ status: 'error', error });
    connection.transport.close();
  }

  private async authorize(connection: Connection): Promise<void> {
    if (!connection.id || !this.current(connection) || connection.authorizing) return;
    const controller = new AbortController();
    const cancelTimeout = this.environment.schedule(() => controller.abort(), 8000);
    const request = { controller, cancelTimeout };
    connection.authorizing = request;
    try {
      const result = await this.environment.authorize(
        connection.id,
        connection.transport.authorizationKey,
        controller.signal,
      );
      if (!this.current(connection) || result.ok) return;
      const terminal = [401, 403, 429].includes(result.status);
      if (terminal) this.wanted = false;
      this.update({ status: terminal ? 'error' : 'reconnecting', error: result.error });
      if (result.status === 401 || result.status === 403) this.observer.onRefreshAccount();
      connection.transport.close();
    } catch {
      if (this.current(connection) && !connection.confirmed) connection.transport.close();
    } finally {
      cancelTimeout();
      if (connection.authorizing === request) connection.authorizing = undefined;
    }
  }

  private dial(): void {
    if (!this.wanted) return;
    const reconnecting = Boolean(this.connection || this.attempts);
    const generation = ++this.generation;
    this.cancelReconnect?.();
    this.cancelReconnect = undefined;
    this.release();
    this.update({ status: reconnecting ? 'reconnecting' : 'connecting' });
    let transport: ChatSessionTransport;
    try {
      transport = this.environment.createTransport();
    } catch (error) {
      this.wanted = false;
      this.update({ status: 'error', error: error instanceof UnsupportedChatTransport ? 'websocket_required' : error instanceof UnconfiguredChatTransport ? 'chat_key_unconfigured' : 'connection_failed' });
      return;
    }
    const connection: Connection = {
      transport,
      generation,
      id: '',
      confirmed: false,
      receiptRetries: 0,
      history: new ChatHistoryRequests(transport, () => this.access, this.environment.now, this.environment.schedule),
      staff: false,
      deadline: 0,
    };
    this.connection = connection;
    this.expire(connection, 16_000);
    transport.onmessage = (record) => this.receive(connection, record);
    transport.onclose = () => {
      if (!this.current(connection)) return;
      this.release();
      if (!this.wanted) {
        this.update({ status: 'error', error: this.state.error ?? 'connection_failed' });
        return;
      }
      this.update({ status: 'reconnecting', error: this.state.error });
      const delay =
        Math.min(30_000, 1000 * 2 ** Math.min(this.attempts++, 5)) + Math.random() * 750;
      this.cancelReconnect = this.environment.schedule(() => this.dial(), delay);
    };
    transport.onerror = (failure) => {
      if (!this.current(connection) || !this.wanted) return;
      if (failure === 'protocol') this.fail(connection, 'invalid_response');
      else this.update({ status: 'reconnecting', error: 'connection_failed' });
    };
  }

  private finishDelivery(requestId: string): void {
    this.unconfirmed.delete(requestId);
    this.deliveries.get(requestId)?.();
    this.deliveries.delete(requestId);
  }

  private queryReceipts(connection: Connection, candidates: Map<string, UnconfirmedDelivery>): void {
    const lookup = new Map([...candidates].filter(([id, attempt]) =>
      this.unconfirmed.get(id) === attempt && (attempt.channel !== 'staff' || connection.staff)));
    if (lookup.size === 0) return;
    connection.queriedReceipts = lookup;
    connection.history.recordReceiptLookup();
    try {
      connection.transport.send({ type: 'receipts', requestIds: [...lookup.keys()] });
    } catch {
      connection.transport.close();
    }
  }

  private receive(connection: Connection, data: unknown): void {
    if (!this.current(connection)) return;
    const parsed = chatServerEventSchema.safeParse(data);
    if (!parsed.success) {
      this.fail(connection, 'invalid_response');
      return;
    }
    const event = parsed.data;
    if (event.type === 'hello') {
      if (connection.id) this.fail(connection, 'invalid_response');
      else {
        connection.id = event.connectionId;
        this.update({ status: 'authorizing' });
        void this.authorize(connection);
      }
      return;
    }
    if (event.type === 'authorized') {
      if (!connection.id || connection.confirmed) {
        this.fail(connection, 'invalid_response');
        return;
      }
      if (event.playerUuid !== this.owner) {
        this.fail(connection, 'session_changed');
        this.observer.onRefreshAccount();
        return;
      }
      if (!event.validForMs) {
        connection.transport.close();
        return;
      }
      connection.confirmed = true;
      connection.staff = event.staff;
      this.attempts = 0;
      this.expire(connection, event.validForMs);
      for (const [id, { channel }] of this.unconfirmed) {
        if (channel === 'staff' && !event.staff) this.finishDelivery(id);
      }
      this.queryReceipts(connection, this.unconfirmed);
      if (!this.current(connection)) return;
      this.update({ status: 'online' });
    } else if (event.type === 'closed') {
      const terminal = isTerminalChatClose(event.reason);
      if (terminal) {
        this.unconfirmed.clear();
        this.wanted = false;
      }
      this.update({ status: terminal ? 'error' : 'reconnecting', error: event.reason });
    } else if (!connection.confirmed) {
      this.fail(connection, 'invalid_response');
      return;
    } else if (this.environment.now() >= connection.deadline) {
      connection.transport.close();
      return;
    } else if (event.type === 'lease') {
      if (!event.validForMs) {
        connection.transport.close();
        return;
      }
      this.expire(connection, event.validForMs);
      if (event.staff !== undefined && event.staff !== connection.staff) {
        connection.staff = event.staff;
        if (!event.staff) {
          connection.history.revokeStaff();
          for (const [id, { channel }] of this.unconfirmed)
            if (channel === 'staff') this.finishDelivery(id);
        }
        this.observer.onEvent({ type: 'permissions', staff: event.staff }, () => this.current(connection));
      }
      this.observer.onLease?.(connection.deadline);
      return;
    } else if (event.type === 'presence') {
      this.presence = event;
      this.presenceRevision = event.revision ?? 0;
    } else if (event.type === 'presenceDelta') {
      if (event.base !== this.presenceRevision || event.revision !== event.base + 1) {
        connection.transport.close();
        return;
      }
      const replaced = new Set([...event.remove, ...event.upsert.map(({ player }) => player.playerUuid)]);
      const players = this.presence.players.filter((peer) => !replaced.has(peer.playerUuid));
      let previousIndex = -1;
      for (const { index, player } of event.upsert) {
        if (index <= previousIndex || index > players.length) {
          this.fail(connection, 'invalid_response');
          return;
        }
        players.splice(index, 0, player);
        previousIndex = index;
      }
      const visible = new Set(players.map((peer) => peer.playerUuid));
      const staffPlayers = event.staffPlayers ?? this.presence.staffPlayers;
      if (players.length > 512 || visible.size !== players.length || staffPlayers.some((id) => !visible.has(id))) {
        this.fail(connection, 'invalid_response');
        return;
      }
      this.presence = {players, staffPlayers};
      this.presenceRevision = event.revision;
      this.observer.onEvent({ type: 'presence', ...this.presence }, () => this.current(connection));
      return;
    } else if (event.type === 'message') {
      if (!mayReadMessage(event.message, this.owner, connection.staff)) {
        this.fail(connection, 'invalid_response');
        return;
      }
      if (
        event.message.kind === 'user' &&
        event.message.sender.playerUuid === this.owner &&
        event.message.requestId
      )
        this.finishDelivery(event.message.requestId);
    } else if (event.type === 'error' && !event.requestId && event.error === 'chat_busy' && connection.queriedReceipts) {
      const lookup = connection.queriedReceipts;
      connection.queriedReceipts = undefined;
      if (connection.receiptRetries < 2) {
        connection.receiptRetries++;
        connection.cancelReceiptRetry = this.environment.schedule(() => {
          if (this.current(connection) && this.access) this.queryReceipts(connection, lookup);
        }, 1000 * connection.receiptRetries);
      }
      return;
    } else if (event.type === 'receipts') {
      const queried = connection.queriedReceipts;
      if (!queried || event.items.some(item => !queried.has(item.requestId))) {
        this.fail(connection, 'invalid_response');
        return;
      }
      connection.queriedReceipts = undefined;
      for (const item of event.items) {
        if (!this.unconfirmed.has(item.requestId)) continue;
        this.finishDelivery(item.requestId);
        this.observer.onEvent({ type: 'accepted', ...item }, () => this.current(connection));
      }
      // A miss remains unknown in the UI. Probe the ID again only if another send became ambiguous.
      for (const [id, attempt] of queried)
        if (this.unconfirmed.get(id) === attempt) this.unconfirmed.delete(id);
      return;
    } else if (event.type === 'history' || event.type === 'historyCurrent') {
      this.fail(connection, 'invalid_response');
      return;
    } else if (event.type === 'accepted' || event.type === 'error')
      this.finishDelivery(event.requestId);
    // The generation guard also protects storage cleanup after a terminal socket close.
    this.observer.onEvent(event, () => this.generation === connection.generation);
    if (event.type === 'closed') connection.transport.close();
  }
}
