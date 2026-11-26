import type { RecipientContext, SenderContext } from '@hpke/core';

import { CHAT_PROTOCOL_VERSION, CHAT_TRANSPORT_URL } from '@/shared/config/service-config';
import { isRecord } from '@/shared/lib/is-record';
import {
  compressChatRequest,
  COMPRESSED_APPLICATION_RECORD_TYPE,
  decompressChatPacket,
  MAX_CHAT_BYTES,
  MAX_CHAT_REQUEST_BYTES,
  supportsChatDecompression,
} from './chat-compression';
import type { ChatHistoryQuery } from './chat-history-requests';
import { beginChatKeys, chatIdentity, CHAT_TAG_BYTES } from './chat-keys';

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
const HISTORY = 2;
const HISTORY_DONE = 4;
const HISTORY_ABORT = 5;
const MAX_RECORDS = 16_384;
const MAX_PENDING_BYTES = 32 * 1024;

export type ChatLiveRequest =
  | {
      type: 'send';
      requestId: string;
      text: string;
      channel: ChatHistoryQuery['channel'];
      targetUuid?: string;
    }
  | { type: 'receipts'; requestIds: string[] };

export type ChatHistoryRequest =
  | {
      type: 'resume';
      requestId: string;
      positions: Partial<Record<ChatHistoryQuery['channel'], string>>;
    }
  | ({ type: 'history'; requestId: string } & ChatHistoryQuery);

export type ChatTransportFailure = 'network' | 'protocol';

type HistoryExchange = {
  signal: AbortSignal;
  receive: (record: unknown) => void;
  complete: ReturnType<typeof Promise.withResolvers<void>>;
  pending: Promise<void>;
  sent: boolean;
};

export class UnsupportedChatTransport extends Error {}
export class UnconfiguredChatTransport extends Error {}

export class ChatTransport {
  onmessage: ((record: unknown) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((failure: ChatTransportFailure) => void) | null = null;
  readyState: 'connecting' | 'open' | 'closed' = 'connecting';
  authorizationKey = '';

  private readonly socket: WebSocket;
  private readonly identity: Uint8Array<ArrayBuffer>;
  private readonly deflate = supportsChatDecompression();
  private readonly lifetime = new AbortController();
  private readonly exchanges = new Map<number, HistoryExchange>();
  private exchangeId = 0;
  private finishKeys?: (enc: ArrayBuffer) => Promise<RecipientContext>;
  private incoming?: RecipientContext;
  private outgoing?: SenderContext;
  private reading = Promise.resolve();
  private writing = Promise.resolve();
  private pendingBytes = 0;
  private received = 0;
  private sent = 0;
  private queued = 0;
  private queuedBytes = 0;
  private authorized = false;

  constructor(identity = process.env.NEXT_PUBLIC_WEB_CHAT_PUBLIC_KEY ?? '') {
    if (typeof WebSocket === 'undefined' || !globalThis.crypto?.subtle) throw new UnsupportedChatTransport();
    try {
      this.identity = chatIdentity(identity);
    } catch {
      throw new UnconfiguredChatTransport();
    }
    this.socket = new WebSocket(CHAT_TRANSPORT_URL, CHAT_PROTOCOL_VERSION);
    this.socket.binaryType = 'arraybuffer';
    this.socket.onmessage = (event: MessageEvent<unknown>) => this.queue(event.data);
    this.socket.onerror = () => this.fail('network');
    this.socket.onclose = () => {
      // A terminal authorization record can already be queued for asynchronous decryption.
      void this.reading.then(() => this.close());
    };
  }

  get bufferedAmount() {
    return this.socket.bufferedAmount + this.pendingBytes;
  }

  private queue(data: unknown) {
    if (this.lifetime.signal.aborted) return;
    const size = typeof data === 'string' ? data.length * 3
      : data instanceof ArrayBuffer ? data.byteLength : Infinity;
    if (size > MAX_CHAT_BYTES + 5 + CHAT_TAG_BYTES || this.queued >= 32 || this.queuedBytes + size > 1024 * 1024) {
      this.fail('protocol');
      return;
    }
    this.queued++;
    this.queuedBytes += size;
    const release = () => {
      this.queued--;
      this.queuedBytes -= size;
    };
    this.reading = this.reading.then(async () => {
      let retained = false;
      try {
        if (!this.lifetime.signal.aborted) retained = await this.receive(data, release);
      } catch {
        this.fail('protocol');
      } finally {
        if (!retained) release();
      }
    });
  }

  private async receive(data: unknown, release: () => void): Promise<boolean> {
    const signal = this.lifetime.signal;
    if (!this.outgoing) {
      if (typeof data !== 'string' || data.length > 512 || this.socket.protocol !== CHAT_PROTOCOL_VERSION)
        throw new Error('invalid_chat_hello');
      const hello: unknown = JSON.parse(data);
      if (!isRecord(hello)) throw new Error('invalid_chat_hello');
      const keys = await beginChatKeys(hello, this.identity, this.deflate, signal);
      this.socket.send(keys.reply);
      this.outgoing = keys.outgoing;
      this.finishKeys = keys.finish;
      this.authorizationKey = keys.authorizationKey;
      this.readyState = 'open';
      this.onmessage?.({ type: 'hello', connectionId: keys.connectionId });
      return false;
    }
    if (!(data instanceof ArrayBuffer)) throw new Error('encrypted_chat_required');
    if (this.finishKeys) {
      this.incoming = await this.finishKeys(data);
      this.finishKeys = undefined;
      return false;
    }
    if (!this.incoming || this.received >= MAX_RECORDS) throw new Error('invalid_chat_sequence');
    const clear = new Uint8Array(await this.incoming.open(data));
    this.received++;
    let retained = false;
    try {
      signal.throwIfAborted();
      if (!clear.length) throw new Error('invalid_chat_record_length');
      const kind = clear[0];
      if (kind === 0 || kind === COMPRESSED_APPLICATION_RECORD_TYPE) {
        const event = await this.decode(kind, clear.subarray(1), signal);
        if (event.type === 'hello' || event.type === 'history' || event.type === 'historyCurrent')
          throw new Error('invalid_live_event');
        if (event.type === 'authorized') this.authorized = true;
        this.onmessage?.(event);
      } else {
        retained = this.queueHistory(kind, clear, release);
      }
      return retained;
    } finally {
      if (!retained) clear.fill(0);
    }
  }

  private queueHistory(kind: number, clear: Uint8Array<ArrayBuffer>, release: () => void) {
    if (!this.authorized || kind < HISTORY || kind > HISTORY_ABORT
      || clear.length < 5 || (kind >= HISTORY_DONE && clear.length !== 5))
      throw new Error('invalid_history_record');
    const id = new DataView(clear.buffer).getUint32(1);
    if (!id || id > this.exchangeId) throw new Error('invalid_history_id');
    const job = this.exchanges.get(id);
    if (!job) return false; // A reply can cross the client's cancellation.
    job.pending = job.pending.then(async () => {
      job.signal.throwIfAborted();
      if (this.exchanges.get(id) !== job) return;
      if (kind >= HISTORY_DONE) {
        this.exchanges.delete(id);
        if (kind === HISTORY_DONE) job.complete.resolve();
        else job.complete.reject(new Error('history_unavailable'));
        return;
      }
      const event = await this.decode(kind - HISTORY, clear.subarray(5), job.signal);
      if (event.type !== 'history' && event.type !== 'historyCurrent' && event.type !== 'error')
        throw new Error('invalid_response');
      job.receive(event);
    }).catch((error) => job.complete.reject(error)).finally(() => {
      clear.fill(0);
      release();
    });
    return true;
  }

  private async decode(kind: number, payload: Uint8Array<ArrayBuffer>, signal: AbortSignal) {
    if (!payload.length || payload.length > MAX_CHAT_BYTES) throw new Error('invalid_chat_record_length');
    const compressed = kind === COMPRESSED_APPLICATION_RECORD_TYPE;
    if (compressed && (!this.deflate || !this.authorized)) throw new Error('invalid_record_kind');
    const expanded = compressed ? await decompressChatPacket(payload, signal) : payload;
    try {
      signal.throwIfAborted();
      const event: unknown = JSON.parse(decoder.decode(expanded));
      if (!isRecord(event)) throw new Error('invalid_event');
      if (compressed && !['history', 'message', 'presence', 'presenceDelta'].includes(String(event.type)))
        throw new Error('invalid_compressed_event');
      return event;
    } finally {
      if (compressed) expanded.fill(0);
    }
  }

  private encode(request: ChatLiveRequest | ChatHistoryRequest) {
    const bytes = encoder.encode(JSON.stringify(request));
    if (!this.authorized || this.readyState !== 'open' || bytes.length > MAX_CHAT_REQUEST_BYTES) {
      bytes.fill(0);
      throw new Error('chat_not_writable');
    }
    return bytes;
  }

  private write(
    kind: number,
    bytes: Uint8Array<ArrayBuffer>,
    id?: number,
    job?: HistoryExchange,
    compress = false,
  ): void {
    const total = bytes.length + (id === undefined ? 1 : 5) + CHAT_TAG_BYTES;
    if (this.bufferedAmount + total > MAX_PENDING_BYTES || !this.outgoing) {
      bytes.fill(0);
      throw new Error('chat_not_writable');
    }
    this.pendingBytes += total;
    const signal = this.lifetime.signal;
    const outgoing = this.outgoing;
    this.writing = this.writing.then(async () => {
      if (signal.aborted || job?.signal.aborted) return;
      if (this.sent >= MAX_RECORDS) throw new Error('chat_key_exhausted');
      const compressed = compress ? await compressChatRequest(bytes, signal) : null;
      const payload = compressed ?? bytes;
      const prefix = id === undefined ? 1 : 5;
      const clear = new Uint8Array(prefix + payload.length);
      try {
        clear[0] = compressed ? COMPRESSED_APPLICATION_RECORD_TYPE : kind;
        if (id !== undefined) new DataView(clear.buffer).setUint32(1, id);
        clear.set(payload, prefix);
        if (job) job.sent = true;
        const encrypted = await outgoing.seal(clear);
        signal.throwIfAborted();
        this.sent++;
        this.socket.send(encrypted);
      } finally {
        clear.fill(0);
        compressed?.fill(0);
      }
    }).catch(() => this.fail('network')).finally(() => {
      bytes.fill(0);
      this.pendingBytes -= total;
    });
  }

  send(request: ChatLiveRequest): void {
    this.write(0, this.encode(request), undefined, undefined, this.deflate && request.type === 'send');
  }

  async history(
    request: ChatHistoryRequest,
    cancel: AbortSignal,
    receive: (record: unknown) => void,
  ): Promise<void> {
    const signal = AbortSignal.any([cancel, this.lifetime.signal]);
    signal.throwIfAborted();
    const bytes = this.encode(request);
    const id = ++this.exchangeId;
    const job: HistoryExchange = { signal, receive, complete: Promise.withResolvers(), pending: Promise.resolve(), sent: false };
    const abort = () => job.complete.reject(signal.reason);
    this.exchanges.set(id, job);
    signal.addEventListener('abort', abort, { once: true });
    try {
      this.write(HISTORY, bytes, id, job);
      await job.complete.promise;
    } finally {
      signal.removeEventListener('abort', abort);
      if (this.exchanges.delete(id) && job.sent && !this.lifetime.signal.aborted) {
        try {
          this.write(HISTORY_ABORT, new Uint8Array(), id);
        } catch {
          this.fail('network');
        }
      }
    }
  }

  private fail(reason: ChatTransportFailure) {
    if (this.lifetime.signal.aborted) return;
    this.onerror?.(reason);
    this.close();
  }

  close(): void {
    if (this.lifetime.signal.aborted) return;
    this.readyState = 'closed';
    this.lifetime.abort();
    this.finishKeys = undefined;
    this.incoming = undefined;
    this.outgoing = undefined;
    this.authorizationKey = '';
    this.socket.onmessage = null;
    this.socket.close();
    this.onclose?.();
  }
}
