import type { RecipientContext, SenderContext } from '@hpke/core';
import { Aes256Gcm, CipherSuite, DhkemP256HkdfSha256, HkdfSha256 } from '@hpke/core';

const PROTOCOL = 'mik-chat-hpke-v1\0https://mcmik.top\0';
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });

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

/** Wire encryption only. Identity, permissions and message parsing remain in their existing owners. */
export class ChatTransport {
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private readonly ws: WebSocket;
  private readonly trustedKey: Uint8Array<ArrayBuffer>;
  private readonly suite = new CipherSuite({
    kem: new DhkemP256HkdfSha256(),
    kdf: new HkdfSha256(),
    aead: new Aes256Gcm(),
  });
  private id = '';
  private stage: 'hello' | 'key' | 'confirmation' | 'ready' | 'closed' = 'hello';
  private serverKey: CryptoKey | null = null;
  private clientKey: CryptoKeyPair | null = null;
  private incoming: RecipientContext | null = null;
  private outgoing: SenderContext | null = null;
  private reading = Promise.resolve();
  private writing = Promise.resolve();
  private reads = 0;
  private readBytes = 0;
  private writeBytes = 0;

  constructor() {
    this.trustedKey = decode(process.env.NEXT_PUBLIC_WEB_CHAT_PUBLIC_KEY ?? '', 65);
    this.ws = new WebSocket('wss://chat.mcmik.top/ws');
    this.ws.binaryType = 'arraybuffer';
    this.ws.onmessage = (event: MessageEvent<unknown>) => {
      const size =
        typeof event.data === 'string'
          ? encoder.encode(event.data).length
          : event.data instanceof ArrayBuffer
            ? event.data.byteLength
            : Number.POSITIVE_INFINITY;
      if (size > 128 * 1024 + 16 || this.reads >= 32 || this.readBytes + size > 1024 * 1024) {
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
      this.stage = 'closed';
      this.incoming = null;
      this.outgoing = null;
      this.clientKey = null;
      this.serverKey = null;
      this.onclose?.();
    };
    this.ws.onerror = () => this.onerror?.();
  }

  get readyState(): number {
    return this.ws.readyState;
  }

  get bufferedAmount(): number {
    return this.ws.bufferedAmount + this.writeBytes;
  }

  close(code = 1000): void {
    this.stage = 'closed';
    this.ws.close(code);
  }

  send(json: string): void {
    const clear = encoder.encode(json);
    if (
      this.stage !== 'ready' ||
      this.ws.readyState !== WebSocket.OPEN ||
      clear.length > 8192 ||
      this.bufferedAmount + clear.length > 32 * 1024
    )
      throw new Error('chat_not_writable');
    this.writeBytes += clear.length;
    // HPKE contexts advance a sequence number; concurrent sealing would break ordering.
    this.writing = this.writing
      .then(async () => {
        if (this.stage !== 'ready' || !this.outgoing) throw new Error('chat_closed');
        const cipher = await this.outgoing.seal(clear);
        if (this.stage !== 'ready') return;
        this.ws.send(cipher);
      })
      .catch(() => this.fail())
      .finally(() => {
        clear.fill(0);
        this.writeBytes -= clear.length;
      });
  }

  private info(direction: string): Uint8Array<ArrayBuffer> {
    return encoder.encode(`${PROTOCOL}${this.id}\0${direction}`);
  }

  private fail(): void {
    if (this.stage === 'closed') return;
    this.onerror?.();
    this.close(1008);
  }

  private async receive(data: unknown): Promise<void> {
    if (this.stage === 'closed') return;
    if (this.stage === 'ready') {
      if (!(data instanceof ArrayBuffer) || !this.incoming)
        throw new Error('encrypted_chat_required');
      const clear = await this.incoming.open(data);
      if (this.stage !== 'ready') return;
      this.onmessage?.(new MessageEvent('message', { data: decoder.decode(clear) }));
      return;
    }
    if (typeof data !== 'string' || data.length > 1024) throw new Error('invalid_key_exchange');
    const body: unknown = JSON.parse(data);
    if (!body || typeof body !== 'object' || Array.isArray(body))
      throw new Error('invalid_key_exchange');
    const frame = body as Record<string, unknown>;
    if (this.stage === 'hello') {
      if (
        Object.keys(frame).length !== 2 ||
        frame.type !== 'hello' ||
        typeof frame.connectionId !== 'string' ||
        !/^[A-Za-z0-9_-]{32}$/.test(frame.connectionId)
      )
        throw new Error('invalid_connection');
      this.id = frame.connectionId;
      this.stage = 'key';
      this.onmessage?.(new MessageEvent('message', { data }));
      return;
    }
    if (frame.type !== 'key' || Object.keys(frame).length !== 3)
      throw new Error('invalid_key_exchange');
    if (this.stage === 'key') {
      const publicKey = decode(frame.key, 65);
      const signature = decode(frame.signature, 64);
      const trusted = await crypto.subtle.importKey(
        'raw',
        this.trustedKey,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['verify'],
      );
      if (
        !(await crypto.subtle.verify(
          { name: 'ECDSA', hash: 'SHA-256' },
          trusted,
          signature,
          this.info(`key\0${frame.key}`),
        ))
      )
        throw new Error('untrusted_chat_key');
      this.serverKey = await this.suite.kem.deserializePublicKey(publicKey);
      this.clientKey = await this.suite.kem.generateKeyPair();
      this.outgoing = await this.suite.createSenderContext({
        recipientPublicKey: this.serverKey,
        info: this.info('client'),
      });
      const reverseKey = await this.suite.kem.serializePublicKey(this.clientKey.publicKey);
      const cipher = await this.outgoing.seal(reverseKey);
      if (this.stage !== 'key') return;
      this.stage = 'confirmation';
      this.ws.send(
        JSON.stringify({ type: 'key', enc: encode(this.outgoing.enc), ciphertext: encode(cipher) }),
      );
      return;
    }
    if (!this.clientKey || !this.serverKey) throw new Error('invalid_key_exchange');
    this.incoming = await this.suite.createRecipientContext({
      recipientKey: this.clientKey.privateKey,
      senderPublicKey: this.serverKey,
      enc: decode(frame.enc, 65),
      info: this.info('server'),
    });
    const ready = await this.incoming.open(decode(frame.ciphertext, 21));
    if (decoder.decode(ready) !== 'ready') throw new Error('invalid_key_confirmation');
    if (this.stage !== 'confirmation') return;
    this.clientKey = null;
    this.serverKey = null;
    this.stage = 'ready';
  }
}
