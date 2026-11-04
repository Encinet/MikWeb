import type { ChatAuthorizationResult } from '@/modules/chat/lib/connection/chat-authorization';
import { authorizeChat } from '@/modules/chat/lib/connection/chat-authorization';
import { ChatTransport } from '@/modules/chat/lib/connection/chat-transport';
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

export type ChatSessionEvent = Exclude<ChatServerEvent, { type: 'hello' | 'reauthorize' }>;
export type ChatSessionTransport = Pick<
  ChatTransport,
  | 'onmessage'
  | 'onclose'
  | 'onerror'
  | 'readyState'
  | 'bufferedAmount'
  | 'authorizationKey'
  | 'send'
  | 'close'
>;

interface SessionObserver {
  onConnection: (connection: ChatConnection) => void;
  onEvent: (event: ChatSessionEvent, current: () => boolean) => void;
  onDisconnect: () => void;
  onDeliveryTimeout: (requestId: string) => void;
  onRefreshAccount: () => void;
}

interface SessionEnvironment {
  createTransport: () => ChatSessionTransport;
  authorize: (
    connectionId: string,
    clientPublicKey: string,
    signal: AbortSignal,
  ) => Promise<ChatAuthorizationResult>;
  now: () => number;
  schedule: (callback: () => void, delay: number) => () => void;
}

const browserEnvironment: SessionEnvironment = {
  createTransport: () => new ChatTransport(),
  authorize: authorizeChat,
  now: () => Date.now(),
  schedule: (callback, delay) => {
    const timer = setTimeout(callback, delay);
    return () => clearTimeout(timer);
  },
};

interface Connection {
  transport: ChatSessionTransport;
  generation: number;
  id: string;
  confirmed: boolean;
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
  private generation = 0;
  private wanted = false;
  private attempts = 0;
  private cancelReconnect?: () => void;
  private deliveries = new Map<string, () => void>();

  constructor(
    private readonly owner: string,
    private readonly observer: SessionObserver,
    private readonly environment: SessionEnvironment = browserEnvironment,
  ) {}

  get hasConnection(): boolean {
    return this.connection !== null;
  }

  get access(): ChatAccess | null {
    const connection = this.connection;
    return this.wanted &&
      this.state.status === 'online' &&
      connection?.confirmed &&
      connection.transport.readyState === WebSocket.OPEN
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
    this.dial();
  }

  recover(): void {
    if (!this.wanted) return;
    const connection = this.connection;
    if (
      connection &&
      (connection.transport.readyState === WebSocket.OPEN ||
        connection.transport.readyState === WebSocket.CONNECTING) &&
      this.environment.now() < connection.deadline
    )
      return;
    this.dial();
  }

  stop(): void {
    this.wanted = false;
    this.generation++;
    this.cancelReconnect?.();
    this.cancelReconnect = undefined;
    this.release();
    this.update({ status: 'idle' });
  }

  send(destination: ChatDestination, text: string): ChatSendResult {
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
    const requestId = crypto.randomUUID();
    try {
      connection.transport.send(
        JSON.stringify({
          type: 'send',
          requestId,
          channel: destination.channel,
          text: value,
          ...(destination.channel === 'private' ? { targetUuid: destination.targetUuid } : {}),
        }),
      );
    } catch {
      this.update({ status: 'reconnecting', error: 'connection_failed' });
      connection.transport.close();
      return { ok: false };
    }
    if (this.deliveries.size >= 20) this.finishDelivery(this.deliveries.keys().next().value ?? '');
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
    this.presence = { players: [], staffPlayers: [] };
    for (const cancel of this.deliveries.values()) cancel();
    this.deliveries.clear();
    if (!previous) return;
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
    } catch {
      this.wanted = false;
      this.update({ status: 'error', error: 'connection_failed' });
      return;
    }
    const connection: Connection = {
      transport,
      generation,
      id: '',
      confirmed: false,
      staff: false,
      deadline: 0,
    };
    this.connection = connection;
    this.expire(connection, 16_000);
    transport.onmessage = (event) => this.receive(connection, event.data);
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
    this.deliveries.get(requestId)?.();
    this.deliveries.delete(requestId);
  }

  private receive(connection: Connection, data: unknown): void {
    if (!this.current(connection)) return;
    if (typeof data !== 'string' || data.length > 128 * 1024) {
      this.fail(connection, 'invalid_response');
      return;
    }
    let input: unknown;
    try {
      input = JSON.parse(data);
    } catch {
      this.fail(connection, 'invalid_response');
      return;
    }
    const parsed = chatServerEventSchema.safeParse(input);
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
      if (!connection.id) {
        this.fail(connection, 'invalid_response');
        return;
      }
      if (event.playerUuid !== this.owner) {
        this.fail(connection, 'session_changed');
        this.observer.onRefreshAccount();
        return;
      }
      connection.confirmed = true;
      connection.staff = event.staff;
      this.attempts = 0;
      this.expire(connection, 65_000);
      this.update({ status: 'online' });
    } else if (event.type === 'closed') {
      const terminal = isTerminalChatClose(event.reason);
      if (terminal) this.wanted = false;
      this.update({ status: terminal ? 'error' : 'reconnecting', error: event.reason });
    } else if (!connection.confirmed) {
      this.fail(connection, 'invalid_response');
      return;
    } else if (event.type === 'reauthorize') {
      void this.authorize(connection);
      return;
    } else if (event.type === 'permissions') connection.staff = event.staff;
    else if (event.type === 'presence') this.presence = event;
    else if (event.type === 'message') {
      if (!mayReadMessage(event.message, this.owner, connection.staff)) {
        this.fail(connection, 'invalid_response');
        return;
      }
      if (
        event.message.kind === 'player' &&
        event.message.senderUuid === this.owner &&
        event.message.requestId
      )
        this.finishDelivery(event.message.requestId);
    } else if (event.type === 'accepted' || event.type === 'error')
      this.finishDelivery(event.requestId);
    // The generation guard also protects storage cleanup after a terminal socket close.
    this.observer.onEvent(event, () => this.generation === connection.generation);
    if (event.type === 'closed') connection.transport.close();
  }
}
