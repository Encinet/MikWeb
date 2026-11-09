import 'server-only';

/** RFC 6238 TOTP, HMAC-SHA1; matches the usual authenticator/bot defaults. */
export function decodeBase32(input: string) {
  const cleaned = String(input ?? '')
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/=+$/, '');
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

export async function createTotp(
  secret: string,
  nowMs = Date.now(),
  { period = 30, digits = 6 } = {},
) {
  if (!Number.isInteger(period) || period < 15 || period > 300) {
    throw new Error('Unsupported TOTP period');
  }
  if (!Number.isInteger(digits) || digits < 6 || digits > 8) {
    throw new Error('Unsupported TOTP digits');
  }

  const rawSecret = decodeBase32(secret);
  if (rawSecret.length < 20) throw new Error('TOTP secret must contain at least 20 bytes');

  const counter = Math.floor(nowMs / (period * 1_000));
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
    expiresAt: (counter + 1) * period * 1_000,
    serverTime: nowMs,
    period,
  };
}
