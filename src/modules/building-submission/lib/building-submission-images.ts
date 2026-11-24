import type { AuthAccount } from '@/modules/auth/model/auth-types';
import { isBuildingImageFilename } from '@/modules/building/model/building-validation';
import { isPixelOnlyWebp } from '@/modules/building-submission/lib/is-pixel-only-webp';
import type { BuildingSubmissionImageDraft } from '@/modules/building-submission/model/building-submission-form';
import { BUILDING_SUBMISSION_IMAGE_LIMITS } from '@/modules/building-submission/model/building-submission-limits';
import { isApiErrorPayload } from '@/shared/api/api-error-payload';
import { isRecord } from '@/shared/lib/is-record';

const uploadedDrafts = new WeakMap<
  File,
  { draftKey: string; owner: string; expiresAt: number; filename: string }
>();

export async function createBuildingSubmissionImageDrafts(
  files: File[],
  signal: AbortSignal,
  existing: readonly BuildingSubmissionImageDraft[] = [],
): Promise<BuildingSubmissionImageDraft[]> {
  const drafts: BuildingSubmissionImageDraft[] = [];
  let worker: Worker | null | undefined;
  async function encodeCanvas(context: CanvasRenderingContext2D, tryLossless: boolean) {
    const { canvas } = context;
    if (worker !== null) {
      try {
        worker ??= new Worker(new URL('../worker/encode-webp.worker.ts', import.meta.url));
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
        const bytes = await encodeInWorker(worker, pixels, tryLossless, signal);
        return new Blob([bytes], { type: 'image/webp' });
      } catch {
        signal.throwIfAborted();
        worker?.terminate();
        worker = null;
      }
    }
    // Native encoding also works when workers or WebAssembly are restricted.
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', BUILDING_SUBMISSION_IMAGE_LIMITS.webpQuality / 100),
    );
    if (blob?.type !== 'image/webp') throw new Error('upload_failed');
    return blob;
  }

  try {
    for (const source of files) {
      signal.throwIfAborted();
      const cached = await findPreparedSource(source, [...existing, ...drafts], signal);
      signal.throwIfAborted();
      const { file, width, height } = cached ?? (await prepareImage(source, signal, encodeCanvas));
      signal.throwIfAborted();
      drafts.push({
        id: crypto.randomUUID(),
        source,
        file,
        previewUrl: URL.createObjectURL(file),
        width,
        height,
        size: file.size,
      });
    }
    return drafts;
  } catch (error) {
    for (const draft of drafts) URL.revokeObjectURL(draft.previewUrl);
    throw error;
  } finally {
    worker?.terminate();
  }
}

async function findPreparedSource(
  source: File,
  drafts: readonly BuildingSubmissionImageDraft[],
  signal: AbortSignal,
) {
  for (const draft of drafts) {
    if (source === draft.source) return draft;
    if (source.size !== draft.source.size || source.type !== draft.source.type) continue;
    // A new picker selection produces a new File. Compare bytes only for matching sizes,
    // in bounded chunks so even a large original never needs a full extra copy.
    const chunkSize = 256 * 1024;
    let offset = 0;
    while (offset < source.size) {
      signal.throwIfAborted();
      const end = Math.min(offset + chunkSize, source.size);
      const [selected, prior] = await Promise.all([
        source.slice(offset, end).arrayBuffer(),
        draft.source
          .slice(offset, end)
          .arrayBuffer()
          .catch(() => null),
      ]);
      if (!prior) break;
      const previous = new Uint8Array(prior);
      if (!new Uint8Array(selected).every((byte, i) => byte === previous[i])) break;
      offset = end;
    }
    if (offset === source.size) return draft;
  }
}

async function prepareImage(
  source: File,
  signal: AbortSignal,
  encodeCanvas: (context: CanvasRenderingContext2D, tryLossless: boolean) => Promise<Blob>,
) {
  const limits = BUILDING_SUBMISSION_IMAGE_LIMITS;
  const bitmap = await createImageBitmap(source);
  const scale = Math.min(1, limits.maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  // Flat artwork compresses well as PNG. Try lossless WebP for those sources too.
  const tryLossless = source.type === 'image/png' && source.size <= bitmap.width * bitmap.height;
  let context: CanvasRenderingContext2D;
  try {
    signal.throwIfAborted();
    if (width < limits.minWidth || height < limits.minHeight) throw new Error('image_too_small');
    if (
      scale === 1 &&
      source.type === 'image/webp' &&
      source.size <= limits.maxBytes &&
      isPixelOnlyWebp(new Uint8Array(await source.arrayBuffer()))
    ) {
      return { file: source, width, height };
    }
    signal.throwIfAborted();
    context = drawResizedImage(bitmap, width, height);
  } finally {
    bitmap.close();
  }
  try {
    let blob = await encodeCanvas(context, tryLossless);
    while (blob.size > limits.maxBytes) {
      signal.throwIfAborted();
      const canvas = context.canvas;
      // Alpha-heavy images can exceed the encoder's target. Scale the pixels before retrying.
      const scale = Math.max(
        limits.minWidth / canvas.width,
        limits.minHeight / canvas.height,
        0.95 * Math.sqrt(limits.maxBytes / blob.size),
      );
      if (scale >= 1) throw new Error('image_too_large');
      context = drawResizedImage(
        canvas,
        Math.round(canvas.width * scale),
        Math.round(canvas.height * scale),
      );
      canvas.width = 0;
      blob = await encodeCanvas(context, tryLossless);
    }
    return {
      file: new File([blob], 'building.webp', { type: 'image/webp' }),
      width: context.canvas.width,
      height: context.canvas.height,
    };
  } finally {
    context.canvas.width = 0;
  }
}

function drawResizedImage(source: ImageBitmap | HTMLCanvasElement, width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('upload_failed');
  context.imageSmoothingQuality = 'high';
  context.drawImage(source, 0, 0, width, height);
  return context;
}

function encodeInWorker(
  worker: Worker,
  pixels: ImageData,
  tryLossless: boolean,
  signal: AbortSignal,
) {
  const listeners = new AbortController();
  const options = { signal: listeners.signal };
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const failed = () => reject(new Error('upload_failed'));
    signal.addEventListener('abort', () => reject(signal.reason), options);
    worker.addEventListener('error', failed, options);
    worker.addEventListener('messageerror', failed, options);
    worker.addEventListener(
      'message',
      ({ data }: MessageEvent<ArrayBuffer | null>) => {
        if (data) resolve(data);
        else failed();
      },
      options,
    );
    worker.postMessage({ pixels, tryLossless }, [pixels.data.buffer]);
  }).finally(() => listeners.abort());
}

export async function uploadBuildingSubmissionImageDrafts(
  images: BuildingSubmissionImageDraft[],
  account: AuthAccount,
  draftKey: string,
  signal?: AbortSignal,
): Promise<string[]> {
  const filenames: string[] = [];
  for (const draft of images) {
    signal?.throwIfAborted();
    const cached = uploadedDrafts.get(draft.file);
    if (
      cached &&
      cached.draftKey === draftKey &&
      cached.owner === account.playerUuid &&
      cached.expiresAt > Date.now()
    ) {
      filenames.push(cached.filename);
      continue;
    }
    const { filename, expiresAt } = await uploadWebp(draft.file, draftKey, draft.id, signal);
    uploadedDrafts.set(draft.file, {
      draftKey,
      owner: account.playerUuid,
      filename,
      expiresAt,
    });
    filenames.push(filename);
  }
  return filenames;
}

async function uploadWebp(
  file: File,
  draftKey: string,
  requestKey: string,
  signal?: AbortSignal,
): Promise<{ filename: string; expiresAt: number }> {
  const formData = new FormData();
  formData.set('image', file, 'building.webp');
  const response = await fetch('/api/account/images/upload', {
    method: 'POST',
    headers: { 'X-Building-Draft': draftKey, 'X-Upload-Request': requestKey },
    body: formData,
    signal,
  });
  const payload: unknown = await response.json().catch(() => null);
  if (
    !response.ok ||
    !isRecord(payload) ||
    !isBuildingImageFilename(payload.filename) ||
    typeof payload.expiresAt !== 'number' ||
    !Number.isFinite(payload.expiresAt)
  ) {
    throw new Error(isApiErrorPayload(payload) ? payload.error : 'upload_failed');
  }
  return { filename: payload.filename, expiresAt: payload.expiresAt };
}
