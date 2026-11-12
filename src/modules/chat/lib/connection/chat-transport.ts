import type { RecipientContext, SenderContext } from '@hpke/core';
import { Aes256Gcm, CipherSuite, DhkemP256HkdfSha256, HkdfSha256 } from '@hpke/core';
import {
  COMPRESSED_APPLICATION_RECORD_TYPE,
  decompressChatPacket,
  MAX_CHAT_BYTES,
  supportedChatCompression,
} from '@/modules/chat/lib/connection/chat-compression';
import { CHAT_WEBSOCKET_URL } from '@/shared/config/service-config';
import { isRecord } from '@/shared/lib/is-record';

const PROTOCOL = 'mik-chat-hpke-2026-11-08\0https://mcmik.top\0';
const KEY_LIFETIME_MS = 30 * 60 * 1000;
const EXCHANGE_TIMEOUT_MS = 5000;
const APPLICATION_RECORD_TYPE = 0;
const KEY_EXCHANGE_RECORD_TYPE = 1;
// Allow bounded records already in flight when the server starts rotating at 16,384.
const HARD_RECORD_LIMIT = 16_384 + 256;
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });

export type ChatTransportFailure = 'network' | 'protocol';

interface Session {
  generation: number;
  incoming: RecipientContext;
  outgoing: SenderContext;
  expiresAt: number;
  expiresAtWallClock: number;
  received: number;
  sent: number;
}

interface Exchange {
  generation: number;
  expiresAt: number;
  serverKey: CryptoKey | null;
  clientKey: CryptoKeyPair | null;
  outgoing: SenderContext | null;
  resume: () => void;
}

function encode(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

function decode(value: unknown, size: number): Uint8Array<ArrayBuffer> {
  if (
    typeof value !== 'string' ||
    value.length !== Math.ceil((size * 8) / 6) ||
    !/^[A-Za-z0-9_-]+$/.test(value)
  )
    throw new Error('invalid_encryption_field');
  const bytes = Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/')), (c) =>
    c.charCodeAt(0),
  );
  if (bytes.length !== size || encode(bytes.buffer) !== value)
    throw new Error('invalid_encryption_field');
  return bytes;
}

function readChatRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new Error('invalid_chat_record');
  return value;
}

/** Owns wire encryption and key lifetimes; authorization and logical presence stay above it. */
export class ChatTransport {
  private readonly compression = supportedChatCompression();
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((failure: ChatTransportFailure) => void) | null = null;
  private readonly ws: WebSocket;
  private readonly trustedKey: Uint8Array<ArrayBuffer>;
  private readonly suite = new CipherSuite({
    kem: new DhkemP256HkdfSha256(),
    kdf: new HkdfSha256(),
    aead: new Aes256Gcm(),
  });
  private id = '';
  private boundKey = '';
  private initialClientKey: CryptoKeyPair | null = null;
  private stage: 'hello' | 'key' | 'confirmation' | 'ready' | 'closed' = 'hello';
  private session: Session | null = null;
  private exchange: Exchange | null = null;
  private exchangeTimer: ReturnType<typeof setTimeout> | null = null;
  private lifetimeTimer: ReturnType<typeof setTimeout> | null = null;
  private reading = Promise.resolve();
  private writing = Promise.resolve();
  private cleartext = new Set<Uint8Array<ArrayBuffer>>();
  private readonly lifetime = new AbortController();
  private reads = 0;
  private readBytes = 0;
  private writeBytes = 0;

  constructor() {
    this.trustedKey = decode(process.env.NEXT_PUBLIC_WEB_CHAT_PUBLIC_KEY ?? '', 65);
    this.ws = new WebSocket(CHAT_WEBSOCKET_URL);
    this.ws.binaryType = 'arraybuffer';
    this.ws.onmessage = (event: MessageEvent<unknown>) => {
      if (this.stage === 'closed') return;
      const size =
        typeof event.data === 'string'
          ? encoder.encode(event.data).length
          : event.data instanceof ArrayBuffer
            ? event.data.byteLength
            : Number.POSITIVE_INFINITY;
      if (
        size > MAX_CHAT_BYTES + 1 + 16 ||
        this.reads >= 32 ||
        this.readBytes + size > 1024 * 1024
      ) {
        this.fail();
        return;
      }
      this.reads++;
      this.readBytes += size;
      this.reading = this.reading
        .then(() => this.receive(event.data))
        .catch(() => this.fail())
        .finally(() => {
          this.reads--;
          this.readBytes -= size;
        });
    };
    this.ws.onclose = () => {
      this.destroy();
      this.onclose?.();
    };
    this.ws.onerror = () => {
      if (this.stage === 'closed') return;
      this.close();
      this.onerror?.('network');
    };
  }

  get readyState(): number {
    return this.ws.readyState;
  }

  get bufferedAmount(): number {
    return this.ws.bufferedAmount + this.writeBytes;
  }

  get authorizationKey(): string {
    return this.boundKey;
  }

  close(code = 1000): void {
    this.destroy();
    this.ws.close(code);
  }

  send(json: string): void {
    const clear = encoder.encode(json);
    if (
      this.stage === 'closed' ||
      !this.session ||
      this.ws.readyState !== WebSocket.OPEN ||
      clear.length > 8192 ||
      this.bufferedAmount + clear.length > 32 * 1024
    ) {
      clear.fill(0);
      throw new Error('chat_not_writable');
    }
    this.cleartext.add(clear);
    this.writeBytes += clear.length;
    // The exchange barrier pauses new writes while previous records finish under the old key.
    this.writing = this.writing
      .then(async () => {
        if (this.stage === 'closed' || !this.session) return;
        await this.writeProtected(this.session, clear);
      })
      .catch(() => this.fail())
      .finally(() => {
        clear.fill(0);
        if (this.cleartext.delete(clear)) this.writeBytes -= clear.length;
      });
  }

  private info(generation: number, direction: string): Uint8Array<ArrayBuffer> {
    return encoder.encode(`${PROTOCOL}${this.id}\0${generation}\0${this.boundKey}\0${direction}`);
  }

  private destroyExchange(): void {
    if (this.exchangeTimer) clearTimeout(this.exchangeTimer);
    this.exchangeTimer = null;
    const exchange = this.exchange;
    this.exchange = null;
    if (exchange) {
      exchange.clientKey = null;
      exchange.serverKey = null;
      exchange.outgoing = null;
      exchange.resume();
    }
  }

  private destroy(): void {
    this.stage = 'closed';
    this.lifetime.abort();
    if (this.lifetimeTimer) clearTimeout(this.lifetimeTimer);
    this.lifetimeTimer = null;
    this.session = null;
    this.initialClientKey = null;
    this.destroyExchange();
    for (const clear of this.cleartext) clear.fill(0);
    this.cleartext.clear();
    this.writeBytes = 0;
    this.ws.onmessage = null;
    this.id = '';
    this.boundKey = '';
  }

  private fail(): void {
    if (this.stage === 'closed') return;
    if (
      this.ws.readyState !== WebSocket.OPEN ||
      (this.exchange && Date.now() >= this.exchange.expiresAt)
    ) {
      this.close(4001);
      return;
    }
    this.close(4002);
    this.onerror?.('protocol');
  }

  private usable(session: Session): boolean {
    if (this.stage === 'closed' || this.session !== session) return false;
    if (
      this.ws.readyState !== WebSocket.OPEN ||
      performance.now() >= session.expiresAt ||
      Date.now() >= session.expiresAtWallClock ||
      session.sent >= HARD_RECORD_LIMIT ||
      session.received >= HARD_RECORD_LIMIT
    ) {
      this.close(4001);
      return false;
    }
    return true;
  }

  private async writeProtected(
    session: Session,
    clear: Uint8Array<ArrayBuffer>,
    kind = APPLICATION_RECORD_TYPE,
  ): Promise<void> {
    if (!this.usable(session)) return;
    const record = new Uint8Array(clear.length + 1);
    record[0] = kind;
    record.set(clear, 1);
    this.cleartext.add(record);
    try {
      const cipher = await session.outgoing.seal(record);
      if (!this.usable(session)) return;
      session.sent++;
      this.ws.send(cipher);
    } finally {
      record.fill(0);
      this.cleartext.delete(record);
    }
  }

  private async receive(data: unknown): Promise<void> {
    if (this.stage === 'closed') return;
    if (this.ws.readyState !== WebSocket.OPEN) {
      this.close(4001);
      return;
    }
    if (this.session) {
      const session = this.session;
      if (!(data instanceof ArrayBuffer)) throw new Error('encrypted_chat_required');
      if (!this.usable(session)) return;
      const clear = await session.incoming.open(data);
      const record = new Uint8Array(clear);
      this.cleartext.add(record);
      try {
        if (!this.usable(session)) return;
        session.received++;
        if (record.length < 2) throw new Error('invalid_chat_record');
        if (record[0] === KEY_EXCHANGE_RECORD_TYPE) {
          if (record.length > 1025) throw new Error('invalid_key_exchange');
          await this.keyFrame(readChatRecord(JSON.parse(decoder.decode(record.subarray(1)))), true);
        } else if (record[0] === APPLICATION_RECORD_TYPE) {
          if (this.stage !== 'ready') throw new Error('application_during_key_exchange');
          this.onmessage?.(
            new MessageEvent('message', { data: decoder.decode(record.subarray(1)) }),
          );
        } else if (record[0] === COMPRESSED_APPLICATION_RECORD_TYPE) {
          if (this.stage !== 'ready' || !this.compression)
            throw new Error('unexpected_compressed_record');
          const expanded = await decompressChatPacket(record.subarray(1), this.lifetime.signal);
          this.cleartext.add(expanded);
          try {
            if (!this.usable(session)) return;
            const json = decoder.decode(expanded);
            if (
              !['history', 'message', 'presence'].includes(
                String(readChatRecord(JSON.parse(json)).type),
              )
            )
              throw new Error('invalid_compressed_record');
            this.onmessage?.(new MessageEvent('message', { data: json }));
          } finally {
            expanded.fill(0);
            this.cleartext.delete(expanded);
          }
        } else throw new Error('invalid_chat_record');
      } finally {
        record.fill(0);
        this.cleartext.delete(record);
      }
      return;
    }
    if (typeof data !== 'string' || data.length > 1024) throw new Error('invalid_key_exchange');
    const body = readChatRecord(JSON.parse(data));
    if (this.stage === 'hello') {
      if (
        Object.keys(body).length !== 2 ||
        body.type !== 'hello' ||
        typeof body.connectionId !== 'string' ||
        !/^[A-Za-z0-9_-]{32}$/.test(body.connectionId)
      )
        throw new Error('invalid_connection');
      this.id = body.connectionId;
      this.stage = 'key';
      const clientKey = await crypto.subtle.generateKey(
        { name: 'ECDH', namedCurve: 'P-256' },
        false,
        ['deriveBits'],
      );
      const publicKey = await this.suite.kem.serializePublicKey(clientKey.publicKey);
      if (this.id !== body.connectionId || this.ws.readyState !== WebSocket.OPEN) return;
      this.initialClientKey = clientKey;
      this.boundKey = encode(publicKey);
      this.onmessage?.(new MessageEvent('message', { data }));
      return;
    }
    await this.keyFrame(body, false);
  }

  private async keyFrame(frame: Record<string, unknown>, encrypted: boolean): Promise<void> {
    if (
      frame.type !== 'key' ||
      Object.keys(frame).length !== 4 ||
      typeof frame.generation !== 'number' ||
      !Number.isSafeInteger(frame.generation) ||
      frame.generation < 0 ||
      encrypted !== Boolean(this.session)
    )
      throw new Error('invalid_key_exchange');
    if ('key' in frame) {
      if (
        this.exchange ||
        this.stage !== (this.session ? 'ready' : 'key') ||
        frame.generation !== (this.session ? this.session.generation + 1 : 0)
      )
        throw new Error('invalid_key_generation');
      await this.beginExchange(frame);
      return;
    }
    const exchange = this.exchange;
    if (exchange && Date.now() >= exchange.expiresAt) {
      this.close(4001);
      return;
    }
    if (
      this.stage !== 'confirmation' ||
      !exchange?.clientKey ||
      !exchange.serverKey ||
      !exchange.outgoing ||
      exchange.generation !== frame.generation
    )
      throw new Error('invalid_key_exchange');
    const incoming = await this.suite.createRecipientContext({
      recipientKey: exchange.clientKey,
      senderPublicKey: exchange.serverKey,
      enc: decode(frame.enc, 65),
      info: this.info(exchange.generation, 'server'),
    });
    if (this.exchange !== exchange) return;
    if (Date.now() >= exchange.expiresAt) {
      this.close(4001);
      return;
    }
    const ready = new Uint8Array(await incoming.open(decode(frame.ciphertext, 21)));
    this.cleartext.add(ready);
    let proof: Uint8Array<ArrayBuffer> | null = null;
    let finished: Uint8Array<ArrayBuffer> | null = null;
    try {
      if (decoder.decode(ready) !== 'ready') throw new Error('invalid_key_confirmation');
      if (this.exchange !== exchange) return;
      if (Date.now() >= exchange.expiresAt) {
        this.close(4001);
        return;
      }
      // The reverse context's exporter proves possession of the HTTP-bound private key.
      proof = new Uint8Array(
        await incoming.export(this.info(exchange.generation, 'client-finished'), 32),
      );
      this.cleartext.add(proof);
      const json = encoder.encode(
        JSON.stringify({
          type: 'finished',
          generation: exchange.generation,
          verify: encode(proof.buffer),
          compression: this.compression,
        }),
      );
      finished = new Uint8Array(json.length + 1);
      finished[0] = KEY_EXCHANGE_RECORD_TYPE;
      finished.set(json, 1);
      json.fill(0);
      this.cleartext.add(finished);
      if (this.exchange !== exchange || !exchange.outgoing) return;
      const cipher = await exchange.outgoing.seal(finished);
      if (this.exchange !== exchange) return;
      if (Date.now() >= exchange.expiresAt || this.ws.readyState !== WebSocket.OPEN) {
        this.close(4001);
        return;
      }
      this.ws.send(cipher);
      this.session = {
        generation: exchange.generation,
        incoming,
        outgoing: exchange.outgoing,
        expiresAt: performance.now() + KEY_LIFETIME_MS + EXCHANGE_TIMEOUT_MS,
        expiresAtWallClock: Date.now() + KEY_LIFETIME_MS + EXCHANGE_TIMEOUT_MS,
        received: 0,
        sent: 1,
      };
      this.initialClientKey = null;
      this.stage = 'ready';
      this.destroyExchange();
      if (this.lifetimeTimer) clearTimeout(this.lifetimeTimer);
      this.lifetimeTimer = setTimeout(
        () => this.close(4001),
        KEY_LIFETIME_MS + EXCHANGE_TIMEOUT_MS,
      );
    } finally {
      for (const clear of [ready, proof, finished]) {
        if (clear) {
          clear.fill(0);
          this.cleartext.delete(clear);
        }
      }
    }
  }

  private async beginExchange(frame: Record<string, unknown>): Promise<void> {
    const previousWrites = this.writing;
    let resume = () => {};
    const paused = new Promise<void>((resolve) => {
      resume = resolve;
    });
    this.writing = previousWrites.then(() => paused);
    const exchange: Exchange = {
      generation: frame.generation as number,
      expiresAt: Date.now() + EXCHANGE_TIMEOUT_MS,
      serverKey: null,
      clientKey: null,
      outgoing: null,
      resume,
    };
    this.exchange = exchange;
    this.stage = 'confirmation';
    this.exchangeTimer = setTimeout(() => this.close(4001), EXCHANGE_TIMEOUT_MS);
    const current = () => {
      if (this.exchange !== exchange) return false;
      if (this.ws.readyState !== WebSocket.OPEN || Date.now() >= exchange.expiresAt) {
        this.close(4001);
        return false;
      }
      return true;
    };
    const publicKey = decode(frame.key, 65);
    const signature = decode(frame.signature, 64);
    const trusted = await crypto.subtle.importKey(
      'raw',
      this.trustedKey,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify'],
    );
    if (!current()) return;
    if (
      !(await crypto.subtle.verify(
        { name: 'ECDSA', hash: 'SHA-256' },
        trusted,
        signature,
        this.info(exchange.generation, `key\0${frame.key}`),
      ))
    )
      throw new Error('untrusted_chat_key');
    if (!current()) return;
    const serverKey = await this.suite.kem.deserializePublicKey(publicKey);
    if (!current()) return;
    exchange.serverKey = serverKey;
    const clientKey =
      exchange.generation === 0
        ? this.initialClientKey
        : await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, [
            'deriveBits',
          ]);
    if (!current()) return;
    if (!clientKey) throw new Error('missing_authorization_key');
    exchange.clientKey = clientKey;
    const outgoing = await this.suite.createSenderContext({
      recipientPublicKey: serverKey,
      info: this.info(exchange.generation, 'client'),
    });
    if (!current()) return;
    exchange.outgoing = outgoing;
    const reverseKey = await this.suite.kem.serializePublicKey(clientKey.publicKey);
    const cipher = await outgoing.seal(reverseKey);
    await previousWrites;
    if (!current()) return;
    const json = JSON.stringify({
      type: 'key',
      generation: exchange.generation,
      enc: encode(outgoing.enc),
      ciphertext: encode(cipher),
    });
    if (this.session) {
      const clear = encoder.encode(json);
      try {
        await this.writeProtected(this.session, clear, KEY_EXCHANGE_RECORD_TYPE);
      } finally {
        clear.fill(0);
      }
    } else this.ws.send(json);
  }
}
