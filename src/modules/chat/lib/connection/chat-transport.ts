import {
  compressChatRequest,
  COMPRESSED_APPLICATION_RECORD_TYPE,
  decompressChatPacket,
  MAX_CHAT_REQUEST_BYTES,
  supportsChatDecompression,
} from '@/modules/chat/lib/connection/chat-compression';
import type { ChatHistoryQuery } from './chat-history-requests';
import { CHAT_TRANSPORT_URL } from '@/shared/config/service-config';
import { isRecord } from '@/shared/lib/is-record';

import { chatRecords, encodeChatRecord, InvalidChatRecord } from './chat-stream';

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });

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

type Writer = WritableStreamDefaultWriter<Uint8Array>;

export class UnsupportedChatTransport extends Error {}

export class ChatTransport {
  onmessage: ((record: unknown) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((failure: ChatTransportFailure) => void) | null = null;
  readyState: 'connecting' | 'open' | 'closed' = 'connecting';
  authorizationKey = '';
  bufferedAmount = 0;

  private readonly connection: WebTransport;
  private readonly deflate = supportsChatDecompression();
  private readonly lifetime = new AbortController();
  private writes = Promise.resolve();
  private live?: Writer;
  private authorized = false;

  constructor() {
    if (typeof WebTransport === 'undefined') throw new UnsupportedChatTransport();
    this.connection = new WebTransport(CHAT_TRANSPORT_URL);
    void this.connection.closed.then(
      () => this.close(),
      () => this.fail('network'),
    );
    void this.start().catch((error) => this.readFailure(error));
  }

  private async start() {
    await this.connection.ready;
    const incoming = this.connection.incomingBidirectionalStreams.getReader();
    try {
      const { done, value: stream } = await incoming.read();
      if (done) throw new Error('missing_live_stream');
      this.lifetime.signal.throwIfAborted();
      this.live = stream.writable.getWriter();
      this.readyState = 'open';
      for await (const frame of chatRecords(stream.readable, this.lifetime.signal)) {
        const event = await this.decode(frame, this.lifetime.signal);
        if (!this.authorizationKey) {
          if (
            event.type !== 'hello' ||
            typeof event.connectionId !== 'string' ||
            !/^[A-Za-z0-9_-]{32}$/.test(event.connectionId)
          )
            throw new InvalidChatRecord('invalid_hello');
          await this.bind(event.connectionId);
        } else if (event.type === 'hello') throw new InvalidChatRecord('duplicate_hello');
        if (event.type === 'history' || event.type === 'historyCurrent')
          throw new InvalidChatRecord('wrong_stream');
        this.lifetime.signal.throwIfAborted();
        if (event.type === 'authorized') this.authorized = true;
        this.onmessage?.(event);
      }
      this.close();
    } finally {
      incoming.releaseLock();
      this.live?.releaseLock();
    }
  }

  private async decode(frame: Uint8Array<ArrayBuffer>, signal: AbortSignal) {
    const compressed = frame[0] === COMPRESSED_APPLICATION_RECORD_TYPE;
    if (frame[0] !== 0 && !(compressed && this.deflate && this.authorized))
      throw new InvalidChatRecord('invalid_record_kind');
    let event: unknown;
    try {
      const body = compressed
        ? await decompressChatPacket(frame.subarray(1), signal)
        : frame.subarray(1);
      event = JSON.parse(decoder.decode(body));
    } catch {
      throw new InvalidChatRecord('invalid_record_body');
    }
    signal.throwIfAborted();
    if (!isRecord(event)) throw new InvalidChatRecord('invalid_event');
    if (
      compressed &&
      !['history', 'message', 'presence', 'presenceDelta'].includes(String(event.type))
    )
      throw new InvalidChatRecord('invalid_compressed_event');
    return event;
  }

  private async bind(id: string) {
    const key = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, [
      'sign',
      'verify',
    ]);
    const raw = new Uint8Array(await crypto.subtle.exportKey('raw', key.publicKey));
    const proof = await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      key.privateKey,
      encoder.encode(
        [new URL(CHAT_TRANSPORT_URL).pathname, location.origin, id, Number(this.deflate)].join(
          '\0',
        ),
      ),
    );
    this.lifetime.signal.throwIfAborted();
    const binding = new Uint8Array(1 + proof.byteLength);
    binding[0] = Number(this.deflate);
    binding.set(new Uint8Array(proof), 1);
    await this.live!.write(binding);
    this.lifetime.signal.throwIfAborted();
    this.authorizationKey = btoa(String.fromCharCode(...raw))
      .replaceAll('+', '-')
      .replaceAll('/', '_')
      .replaceAll('=', '');
  }

  private encode(request: ChatLiveRequest | ChatHistoryRequest) {
    const bytes = encoder.encode(JSON.stringify(request));
    if (!this.authorized || this.readyState !== 'open' || bytes.length > MAX_CHAT_REQUEST_BYTES)
      throw new Error('chat_not_writable');
    return bytes;
  }

  send(request: ChatLiveRequest): void {
    const bytes = this.encode(request);
    if (this.bufferedAmount + bytes.length > 32 * 1024) throw new Error('chat_not_writable');
    this.bufferedAmount += bytes.length;
    const signal = this.lifetime.signal;
    this.writes = this.writes
      .then(async () => {
        signal.throwIfAborted();
        const compressed =
          this.deflate && request.type === 'send' ? await compressChatRequest(bytes, signal) : null;
        signal.throwIfAborted();
        await this.live!.write(
          encodeChatRecord(
            compressed ? COMPRESSED_APPLICATION_RECORD_TYPE : 0,
            compressed ?? bytes,
          ),
        );
      })
      .catch(() => this.fail('network'))
      .finally(() => {
        this.bufferedAmount -= bytes.length;
      });
  }

  async history(
    request: ChatHistoryRequest,
    cancel: AbortSignal,
    receive: (record: unknown) => void,
  ): Promise<void> {
    const bytes = this.encode(request);
    const signal = AbortSignal.any([cancel, this.lifetime.signal]);
    signal.throwIfAborted();
    const stream = await this.connection.createBidirectionalStream();
    const writer = stream.writable.getWriter();
    const abort = () => {
      void writer.abort().catch(() => {});
      // Once acquired, chatRecords owns STOP_SENDING through the same signal.
      if (!stream.readable.locked) void stream.readable.cancel().catch(() => {});
    };
    signal.addEventListener('abort', abort, { once: true });
    try {
      signal.throwIfAborted();
      await writer.write(encodeChatRecord(0, bytes));
      await writer.close();
      for await (const frame of chatRecords(stream.readable, signal)) {
        const event = await this.decode(frame, signal);
        if (event.type !== 'history' && event.type !== 'historyCurrent' && event.type !== 'error')
          throw new InvalidChatRecord('wrong_stream');
        receive(event);
      }
    } catch (error) {
      abort();
      throw error;
    } finally {
      signal.removeEventListener('abort', abort);
      writer.releaseLock();
    }
  }

  private readFailure(error: unknown) {
    this.fail(error instanceof InvalidChatRecord ? 'protocol' : 'network');
  }

  private fail(reason: ChatTransportFailure) {
    if (this.readyState === 'closed') return;
    this.onerror?.(reason);
    this.close();
  }

  close(): void {
    if (this.readyState === 'closed') return;
    this.readyState = 'closed';
    this.lifetime.abort();
    this.authorizationKey = '';
    this.connection.close();
    this.onclose?.();
  }
}
