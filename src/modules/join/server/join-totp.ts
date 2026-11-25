import 'server-only';
import { JOIN_CODE_PERIOD_SECONDS } from '@/modules/join/model/join-code';

export function decodeBase32(input: string) {
  const cleaned = input.toUpperCase().replace(/[\s-]/g, '').replace(/=+$/, '');
  if (!cleaned || !/^[A-Z2-7]+$/.test(cleaned) || [1, 3, 6].includes(cleaned.length % 8)) {
    throw new Error('Invalid Base32 secret');
  }

  let bits = 0;
  let buffer = 0;
  const output: number[] = [];
  for (const char of cleaned) {
    const val = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(char);
    buffer = (buffer << 5) | val;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      output.push((buffer >>> bits) & 0xff);
      buffer &= (1 << bits) - 1;
    }
  }
  if (bits && buffer !== 0) throw new Error('Invalid Base32 padding bits');
  return new Uint8Array(output);
}

/** RFC 6238 TOTP, HMAC-SHA1; matches the usual authenticator/bot defaults. */
export async function createTotp(
  secret: string | Uint8Array<ArrayBuffer>,
  nowMs = Date.now(),
  { digits = 6 } = {},
) {
  if (!Number.isInteger(digits) || digits < 6 || digits > 8) {
    throw new Error('Unsupported TOTP digits');
  }

  const rawSecret = typeof secret === 'string' ? decodeBase32(secret) : secret;
  if (rawSecret.length < 20) throw new Error('TOTP secret must contain at least 20 bytes');

  const periodMs = JOIN_CODE_PERIOD_SECONDS * 1_000;
  const counter = Math.floor(nowMs / periodMs);
  const message = new ArrayBuffer(8);
  new DataView(message).setBigUint64(0, BigInt(counter), false);
  const key = await crypto.subtle.importKey(
    'raw',
    rawSecret,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const hmac = new Uint8Array(await crypto.subtle.sign('HMAC', key, message));
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binCode =
    ((hmac[offset] & 0x7f) << 24) |
    (hmac[offset + 1] << 16) |
    (hmac[offset + 2] << 8) |
    hmac[offset + 3];
  const code = String(binCode % 10 ** digits).padStart(digits, '0');

  return {
    code,
    expiresAt: (counter + 1) * periodMs,
    serverTime: nowMs,
  };
}
