import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import sharp from 'sharp';

const bunTestModule: string = 'bun:test';
const { mock } = await import(bunTestModule);
mock.module('server-only', () => ({}));
let hashes: { webp: string; jxl: string; thumbnailWebp: string } | undefined;
let completion: unknown;
const expiresAt = Date.now() + 60_000;
mock.module('@/modules/auth/server/auth-bff', () => ({
  callImageUploadService: (_: Request, action: string, payload: Record<string, unknown>) => {
    if (action === 'reserve') return Response.json({ uploadId: 'draft' });
    if (action === 'prepare') {
      hashes = payload.hashes as typeof hashes;
      return Response.json({
        put: {
          webp: { url: 'https://storage.test/image.webp', headers: { 'Content-Type': 'image/webp' } },
          jxl: { url: 'https://storage.test/image.jxl', headers: { 'Content-Type': 'image/jxl' } },
          thumbnailWebp: { url: 'https://storage.test/thumbnail.webp', headers: { 'Content-Type': 'image/webp' } },
        },
      });
    }
    completion = payload;
    return Response.json({ image: { ...hashes, jxlPreviewBytes: 0 }, expiresAt });
  },
}));
const { POST } = await import('@/app/api/account/images/upload/route');

// MikData checks the JXL dimensions after storage. This gateway checks the signature.
const jxlBytes = new Uint8Array([0xff, 0x0a, 0x12, 0x34]);

const thumbnail = await sharp({ create: { width: 4, height: 3, channels: 3, background: '#369' } })
  .webp()
  .toBuffer();

async function upload(data: Buffer, jxl: Uint8Array<ArrayBuffer> | null = jxlBytes) {
  const form = new FormData();
  form.set('webp', new File([new Uint8Array(data)], 'building.webp', { type: 'image/webp' }));
  if (jxl) form.set('jxl', new File([jxl], 'building.jxl', { type: 'image/jxl' }));
  form.set('thumbnailWebp', new File([new Uint8Array(thumbnail)], 'thumbnail.webp', { type: 'image/webp' }));
  return POST(
    new Request('https://example.test/api/account/images/upload', {
      method: 'POST',
      headers: { 'X-Building-Draft': 'draft', 'X-Upload-Request': 'image' },
      body: form,
    }),
  );
}

test('forwards client-encoded images unchanged and rejects unprepared files before signing', async () => {
  const image = sharp({ create: { width: 960, height: 540, channels: 3, background: '#369' } });
  const opaque = await image.clone().webp().toBuffer();
  const alpha = await image.clone().ensureAlpha(0.5).webp().toBuffer();
  const lossless = await image.clone().webp({ lossless: true }).toBuffer();
  const tagged = await image.clone().withMetadata().webp().toBuffer();
  const atLimit = await sharp({
    create: { width: 3840, height: 2160, channels: 3, background: '#369' },
  }).webp().toBuffer();
  const beyondLimit = await sharp({
    create: { width: 3841, height: 2160, channels: 3, background: '#369' },
  }).webp().toBuffer();
  const withTail = Buffer.concat([opaque, Buffer.from('trailing bytes')]);
  const previousFetch = globalThis.fetch;
  let stored = Buffer.alloc(0);
  let failJxl = false;
  globalThis.fetch = Object.assign(async (input: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(init?.method, 'PUT');
    const bytes = Buffer.from(await new Response(init?.body).arrayBuffer());
    if (String(input).endsWith('.jxl')) {
      assert.equal(new Headers(init?.headers).get('Content-Type'), 'image/jxl');
      assert.deepEqual(new Uint8Array(bytes), jxlBytes);
      if (failJxl) return new Response(null, { status: 503 });
    } else if (String(input).endsWith('/thumbnail.webp')) {
      assert.deepEqual(bytes, thumbnail);
    } else {
      stored = bytes;
    }
    return new Response(null, { status: 200 });
  }, previousFetch);
  try {
    for (const source of [opaque, alpha, lossless, atLimit]) {
      const response = await upload(source);
      assert.equal(response.status, 200);
      assert.deepEqual(stored, source);
      assert.deepEqual(hashes, {
        webp: createHash('sha256').update(stored).digest('hex'),
        jxl: createHash('sha256').update(jxlBytes).digest('hex'),
        thumbnailWebp: createHash('sha256').update(thumbnail).digest('hex'),
      });
      assert.deepEqual(await response.json(), { image: { ...hashes, jxlPreviewBytes: 0 }, expiresAt });
      assert.deepEqual(completion, { uploadId: 'draft', sizes: { webp: stored.length, jxl: jxlBytes.length, thumbnailWebp: thumbnail.length } });
    }
    const incomplete = Buffer.from(opaque.subarray(0, 30));
    incomplete.writeUInt32LE(incomplete.length - 8, 4);
    incomplete.writeUInt32LE(incomplete.length - 20, 16);
    hashes = undefined;
    for (const source of [incomplete, tagged, withTail]) {
      const response = await upload(source);
      assert.equal(response.status, 422);
      assert.deepEqual(await response.json(), { error: 'invalid_image' });
    }
    const response = await upload(beyondLimit);
    assert.equal(response.status, 422);
    assert.deepEqual(await response.json(), { error: 'invalid_image_dimensions' });
    assert.equal((await upload(opaque, null)).status, 400);
    assert.equal((await upload(opaque, new Uint8Array([0]))).status, 422);
    assert.equal(hashes, undefined);
    completion = undefined;
    failJxl = true;
    assert.equal((await upload(opaque)).status, 502);
    assert.equal(completion, undefined);
  } finally {
    globalThis.fetch = previousFetch;
    mock.restore();
  }
});
