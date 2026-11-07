import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readLimitedResponse } from '@/shared/lib/read-limited-response';

test('response limits reject declared oversized bodies before reading them', async () => {
  let cancelled = false;
  const response = new Response(
    new ReadableStream({
      cancel() {
        cancelled = true;
      },
    }),
    { headers: { 'Content-Length': '1000' } },
  );
  await assert.rejects(readLimitedResponse(response, 10), /size limit/);
  assert.equal(cancelled, true);
  assert.equal(response.body?.locked, false);
});

test('response limits cancel a chunked body even when Content-Length underreports its size', async () => {
  let cancelled = false;
  const response = new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3]));
        controller.enqueue(new Uint8Array([4, 5, 6]));
      },
      cancel() {
        cancelled = true;
      },
    }),
    { headers: { 'Content-Length': '1' } },
  );
  await assert.rejects(readLimitedResponse(response, 5), /size limit/);
  assert.equal(cancelled, true);
  assert.equal(response.body?.locked, false);
});

test('response limits preserve all bytes at the size boundary without a Content-Length', async () => {
  const response = new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2]));
        controller.enqueue(new Uint8Array([3, 4, 5]));
        controller.close();
      },
    }),
  );
  assert.deepEqual(await readLimitedResponse(response, 5), new Uint8Array([1, 2, 3, 4, 5]));
  assert.equal(response.body?.locked, false);
});

test('failed stream cancellation does not replace the size limit error or retain the reader lock', async () => {
  const response = new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3]));
      },
      cancel() {
        throw new Error('Cancellation failed');
      },
    }),
  );
  await assert.rejects(readLimitedResponse(response, 2), /size limit/);
  assert.equal(response.body?.locked, false);
});
