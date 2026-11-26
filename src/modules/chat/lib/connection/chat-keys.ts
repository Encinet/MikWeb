import { Aes256Gcm, CipherSuite, DhkemP256HkdfSha256, HkdfSha256 } from '@hpke/core';
import { CHAT_PROTOCOL_VERSION, CHAT_TRANSPORT_URL } from '@/shared/config/service-config';

const text = new TextEncoder();
const suite = new CipherSuite({
  kem: new DhkemP256HkdfSha256(),
  kdf: new HkdfSha256(),
  aead: new Aes256Gcm(),
});
export const CHAT_PUBLIC_KEY_BYTES = 65;
export const CHAT_TAG_BYTES = 16;

function encode(bytes: Uint8Array<ArrayBuffer>): string {
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function decode(value: unknown, size: number): Uint8Array<ArrayBuffer> {
  if (typeof value !== 'string' || value.length !== Math.ceil(size * 8 / 6) || !/^[A-Za-z0-9_-]+$/.test(value))
    throw new Error('invalid_chat_key');
  const bytes = Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/')), (c) => c.charCodeAt(0));
  if (bytes.length !== size || encode(bytes) !== value) throw new Error('invalid_chat_key');
  return bytes;
}

export function chatIdentity(value: string) {
  return decode(value, CHAT_PUBLIC_KEY_BYTES);
}

export async function beginChatKeys(
  hello: Record<string, unknown>,
  identity: Uint8Array<ArrayBuffer>,
  deflate: boolean,
  signal: AbortSignal,
) {
  const { connectionId, serverKey, signature } = hello;
  if (hello.type !== 'hello' || typeof connectionId !== 'string' || !/^[A-Za-z0-9_-]{32}$/.test(connectionId))
    throw new Error('invalid_hello');
  const raw = decode(serverKey, CHAT_PUBLIC_KEY_BYTES);
  const context = [
    CHAT_PROTOCOL_VERSION, new URL(CHAT_TRANSPORT_URL).pathname, location.origin, connectionId, serverKey,
  ].join('\0');
  const verifier = await crypto.subtle.importKey('raw', identity, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  if (!await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, verifier, decode(signature, 64), text.encode(context)))
    throw new Error('invalid_chat_signature');
  signal.throwIfAborted();
  const server = await suite.kem.deserializePublicKey(raw);
  const client = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
  const publicKey = new Uint8Array(await suite.kem.serializePublicKey(client.publicKey));
  const outgoing = await suite.createSenderContext({
    recipientPublicKey: server,
    senderKey: client,
    info: text.encode(context + '\0client'),
  });
  const proof = new Uint8Array(await outgoing.seal(Uint8Array.of(Number(deflate))));
  const reply = new Uint8Array(CHAT_PUBLIC_KEY_BYTES * 2 + CHAT_TAG_BYTES + 1);
  reply.set(publicKey);
  reply.set(new Uint8Array(outgoing.enc), CHAT_PUBLIC_KEY_BYTES);
  reply.set(proof, CHAT_PUBLIC_KEY_BYTES * 2);
  signal.throwIfAborted();
  return {
    connectionId,
    authorizationKey: encode(publicKey),
    reply,
    outgoing,
    finish: (enc: ArrayBuffer) => {
      if (enc.byteLength !== CHAT_PUBLIC_KEY_BYTES) throw new Error('invalid_chat_encapsulation');
      return suite.createRecipientContext({
        recipientKey: client,
        senderPublicKey: server,
        enc,
        info: text.encode(context + '\0server'),
      });
    },
  };
}
