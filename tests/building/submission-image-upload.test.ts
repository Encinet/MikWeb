import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import sharp from 'sharp';
import { isPixelOnlyWebp } from '@/modules/building-submission/lib/is-pixel-only-webp';

const bunTestModule: string = 'bun:test';
const { mock, spyOn } = await import(bunTestModule);
mock.module('server-only', () => ({}));
let signedHash: string | undefined;
mock.module('@/modules/auth/server/auth-bff', () => ({
  callImageUploadService: (_: Request, action: string, payload: Record<string, unknown>) => {
    if (action === 'reserve') return Response.json({ uploadId: 'draft' });
    if (action === 'prepare') {
      signedHash = String(payload.hash);
      return Response.json({
        url: 'image.webp',
        put: { url: 'https://storage.test', headers: {} },
      });
    }
    return Response.json(payload.image);
  },
}));
const { POST } = await import('@/app/api/account/images/upload/route');

async function upload(data: Buffer) {
  const form = new FormData();
  form.set('image', new Blob([new Uint8Array(data)], { type: 'image/webp' }), 'building.webp');
  return POST(
    new Request('https://example.test/api/account/images/upload', {
      method: 'POST',
      headers: { 'X-Building-Draft': 'draft', 'X-Upload-Request': 'image' },
      body: form,
    }),
  );
}

test('validated still WebP pixels survive upload unchanged and metadata is stripped before signing', async () => {
  const image = sharp({ create: { width: 960, height: 540, channels: 3, background: '#369' } });
  const opaque = await image.clone().webp().toBuffer();
  const alpha = await image.clone().ensureAlpha(0.5).webp().toBuffer();
  const lossless = await image.clone().webp({ lossless: true }).toBuffer();
  const tagged = await image.clone().withMetadata().webp().toBuffer();
  const rotated = await sharp({
    create: { width: 540, height: 960, channels: 3, background: '#369' },
  })
    .withMetadata({ orientation: 6 })
    .webp()
    .toBuffer();
  const withTail = Buffer.concat([opaque, Buffer.from('trailing bytes')]);
  const previousFetch = globalThis.fetch;
  let stored = Buffer.alloc(0);
  globalThis.fetch = Object.assign(async (_: RequestInfo | URL, init?: RequestInit) => {
    stored = Buffer.from(await new Response(init?.body).arrayBuffer());
    return new Response(null, { status: 200 });
  }, previousFetch);
  try {
    for (const [source, reuse] of [
      [opaque, true],
      [alpha, true],
      [lossless, true],
      [tagged, false],
      [rotated, false],
      [withTail, false],
    ] as const) {
      assert.equal(isPixelOnlyWebp(source), reuse);
      const response = await upload(source);
      assert.equal(response.status, 200);
      if (reuse) assert.deepEqual(stored, source);
      else assert.ok(isPixelOnlyWebp(stored));
      const metadata = await sharp(stored).metadata();
      assert.deepEqual(
        [metadata.width, metadata.height, metadata.orientation],
        [960, 540, undefined],
      );
      assert.equal(signedHash, createHash('sha256').update(stored).digest('hex'));
      assert.deepEqual(await response.json(), {
        url: 'image.webp',
        width: 960,
        height: 540,
        size: stored.length,
        mime: 'image/webp',
      });
    }
    const pixelReads = spyOn(sharp.prototype, 'raw');
    assert.equal((await upload(opaque)).status, 200);
    assert.deepEqual(stored, opaque);
    assert.equal(pixelReads.mock.calls.length, 0);
    const incomplete = Buffer.from(opaque.subarray(0, 40));
    incomplete.writeUInt32LE(incomplete.length - 8, 4);
    incomplete.writeUInt32LE(incomplete.length - 20, 16);
    assert.ok(isPixelOnlyWebp(incomplete));
    signedHash = undefined;
    assert.equal((await upload(incomplete)).status, 422);
    assert.equal(signedHash, undefined);
    const tooNarrow = await image.clone().withMetadata({ orientation: 6 }).webp().toBuffer();
    const response = await upload(tooNarrow);
    assert.equal(response.status, 422);
    assert.deepEqual(await response.json(), { error: 'invalid_image_dimensions' });
    assert.equal(signedHash, undefined);
  } finally {
    globalThis.fetch = previousFetch;
    mock.restore();
  }
});
