import { readLimitedResponse } from '@/shared/lib/read-limited-response';

import { MAX_JXL_PREVIEW_BYTES } from '../model/building-types';

const MIME = 'image/jxl';
const MAX_BYTES = 4 * 1024 * 1024;
const DEFAULT_PREVIEW_BYTES = 96 * 1024;
let support: Promise<boolean> | undefined;

export interface JxlPrefix {
  bytes: Uint8Array<ArrayBuffer>;
  complete: boolean;
}

export async function readJxlPrefix(
  url: string,
  hint = DEFAULT_PREVIEW_BYTES,
): Promise<JxlPrefix | null> {
  if (!hint || typeof ImageDecoder === 'undefined') return null;
  support ??= ImageDecoder.isTypeSupported(MIME).catch(() => false);
  if (!(await support)) return null;
  const limit = Math.min(hint, MAX_JXL_PREVIEW_BYTES);
  const response = await fetch(url, {
    headers: { Range: `bytes=0-${limit - 1}` },
    signal: AbortSignal.timeout(10_000),
  });
  // Some origins ignore Range. Cancel at the headers unless the entire object fits.
  const length = Number(response.headers.get('content-length'));
  if (response.status !== 206 && !(response.status === 200 && length > 0 && length <= limit)) {
    await response.body?.cancel();
    return null;
  }
  const bytes = await readLimitedResponse(response, limit);
  const range = response.headers.get('content-range');
  if (!bytes.length) return null;
  if (range) {
    const match = /^bytes 0-(\d+)\/(\d+|\*)$/i.exec(range);
    if (!match || Number(match[1]) + 1 !== bytes.length) return null;
    return { bytes, complete: bytes.length === Number(match[2]) };
  }
  // Content-Range need not be exposed by cross-origin object storage.
  return { bytes, complete: response.status === 200 || bytes.length < limit };
}

function hasVisiblePixels(frame: VideoFrame) {
  const sample = document.createElement('canvas');
  sample.width = sample.height = 16;
  const context = sample.getContext('2d', { willReadFrequently: true })!;
  context.drawImage(frame, 0, 0, 16, 16);
  return context.getImageData(0, 0, 16, 16).data.some((v, i) => i % 4 === 3 && v > 0);
}

export async function decodeJxlPreview(prefix: JxlPrefix): Promise<string | null> {
  const decoder = new ImageDecoder({
    type: MIME,
    data: new ReadableStream({
      start(controller) {
        controller.enqueue(prefix.bytes);
        if (prefix.complete) controller.close();
      },
    }),
  });
  // A decoder can wait for more data indefinitely or return an empty partial frame.
  const timer = setTimeout(() => decoder.close(), 1500);
  try {
    const { image, complete } = await decoder.decode({ completeFramesOnly: false });
    try {
      if (!complete && !hasVisiblePixels(image)) return null;
      const scale = Math.min(1, 640 / Math.max(image.displayWidth, image.displayHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.displayWidth * scale));
      canvas.height = Math.max(1, Math.round(image.displayHeight * scale));
      canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/webp', 0.82);
    } finally {
      image.close();
    }
  } finally {
    clearTimeout(timer);
    decoder.close();
  }
}

/** Feed stored and incoming bytes to one decoder. Keep encoded bytes for reopening the detail. */
export async function decodeJxlOriginal(
  url: string,
  prefix: JxlPrefix,
  signal: AbortSignal,
  paint: (frame: VideoFrame) => void,
): Promise<Blob> {
  const offset = prefix.bytes.length;
  const response = prefix.complete
    ? null
    : await fetch(url, {
        headers: { Range: `bytes=${offset}-` },
        signal,
        priority: 'high',
      });
  let first = prefix.bytes;
  let expectedSize: number | undefined;
  const range = response?.headers.get('content-range');
  if (response?.status === 200) {
    // Use the full response already in flight when an origin ignores the second range.
    first = new Uint8Array(0);
  } else if (response?.status === 206) {
    if (range) {
      const match = /^bytes (\d+)-(\d+)\/(\d+|\*)$/i.exec(range);
      if (
        !match ||
        Number(match[1]) !== offset ||
        (match[3] !== '*' && Number(match[2]) + 1 !== Number(match[3]))
      ) {
        await response.body?.cancel();
        throw new Error('Unexpected JPEG XL range');
      }
      expectedSize = Number(match[2]) + 1;
    }
  } else if (response && !(response.status === 416 && (!range || range === `bytes */${offset}`))) {
    await response.body?.cancel();
    throw new Error('JPEG XL continuation unavailable');
  }
  // With hidden range headers, a file exactly as long as the prefix can return 416.
  if (response?.status === 416) await response.body?.cancel();
  const reader = response?.ok ? response.body?.getReader() : undefined;
  if (response?.ok && !reader) throw new Error('Missing JPEG XL body');
  const chunks: BlobPart[] = [first];
  let length = first.length;
  const stream = new ReadableStream<Uint8Array<ArrayBuffer>>({
    start(controller) {
      if (first.length) controller.enqueue(first);
      if (!reader) controller.close();
    },
    async pull(controller) {
      if (!reader) return;
      const { done, value } = await reader.read();
      if (done) {
        if (expectedSize !== undefined && length !== expectedSize)
          throw new Error('Incomplete JPEG XL range');
        controller.close();
        return;
      }
      length += value.byteLength;
      if (length > MAX_BYTES) throw new Error('JPEG XL exceeds size limit');
      chunks.push(value);
      controller.enqueue(value);
    },
  });
  const decoder = new ImageDecoder({ type: MIME, data: stream });
  const close = () => decoder.close();
  signal.addEventListener('abort', close, { once: true });
  try {
    signal.throwIfAborted();
    let visible = false;
    for (;;) {
      const { image, complete } = await decoder.decode({ completeFramesOnly: false });
      try {
        visible ||= complete || hasVisiblePixels(image);
        if (visible) paint(image);
      } finally {
        image.close();
      }
      if (complete) break;
    }
    await decoder.completed;
    return new Blob(chunks, { type: MIME });
  } finally {
    signal.removeEventListener('abort', close);
    decoder.close();
    await reader?.cancel().catch(() => {});
    reader?.releaseLock();
  }
}
