import type { AuthAccount } from '@/modules/auth/model/auth-types';
import type { BuildingImageFiles, BuildingImageRef, BuildingImageUrl } from '@/modules/building/model/building-types';
import { isBuildingImageRef } from '@/modules/building/model/building-validation';
import type { BuildingSubmissionImageDraft } from '@/modules/building-submission/model/building-submission-form';
import { BUILDING_SUBMISSION_IMAGE_LIMITS } from '@/modules/building-submission/model/building-submission-limits';
import { isApiErrorPayload } from '@/shared/api/api-error-payload';
import { isRecord } from '@/shared/lib/is-record';

const uploadedDrafts = new WeakMap<
  BuildingSubmissionImageDraft['files'],
  { draftKey: string; owner: string; expiresAt: number; image: BuildingImageRef }
>();

export async function createBuildingSubmissionImageDrafts(
  files: File[],
  signal: AbortSignal,
  existing: readonly BuildingSubmissionImageDraft[] = [],
): Promise<BuildingSubmissionImageDraft[]> {
  const drafts: BuildingSubmissionImageDraft[] = [];
  let worker: Worker | undefined;
  async function encodeCanvas(context: CanvasRenderingContext2D, tryLossless: boolean) {
    worker ??= new Worker(new URL('../worker/encode-building-image.worker.ts', import.meta.url));
    const { width, height } = context.canvas;
    const scale = Math.min(1, BUILDING_SUBMISSION_IMAGE_LIMITS.thumbnailDimension / Math.max(width, height));
    const small = drawResizedImage(context.canvas, Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale)));
    const thumbnail = small.getImageData(0, 0, small.canvas.width, small.canvas.height);
    small.canvas.width = 0;
    return encodeInWorker(worker, context.getImageData(0, 0, width, height), thumbnail, tryLossless, signal);
  }

  try {
    for (const source of files) {
      signal.throwIfAborted();
      const cached = await findPreparedSource(source, [...existing, ...drafts], signal);
      signal.throwIfAborted();
      const { files, width, height } = cached ?? (await prepareImage(source, signal, encodeCanvas));
      signal.throwIfAborted();
      drafts.push({
        id: crypto.randomUUID(),
        source,
        files,
        preview: {
          webp: URL.createObjectURL(files.webp) as BuildingImageUrl,
          jxl: URL.createObjectURL(files.jxl) as BuildingImageUrl,
        },
        width,
        height,
      });
    }
    return drafts;
  } catch (error) {
    for (const draft of drafts) releaseBuildingImagePreview(draft);
    throw error;
  } finally {
    worker?.terminate();
  }
}

export function releaseBuildingImagePreview({ preview }: BuildingSubmissionImageDraft) {
  URL.revokeObjectURL(preview.webp);
  URL.revokeObjectURL(preview.jxl);
}

type EncodedImage = BuildingImageFiles<ArrayBuffer>;

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
  encodeCanvas: (context: CanvasRenderingContext2D, tryLossless: boolean) => Promise<EncodedImage>,
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
    context = drawResizedImage(bitmap, width, height);
  } finally {
    bitmap.close();
  }
  try {
    let encoded = await encodeCanvas(context, tryLossless);
    let size = encoded.webp.byteLength + encoded.jxl.byteLength;
    while (size > limits.maxBytes) {
      signal.throwIfAborted();
      const canvas = context.canvas;
      // Alpha-heavy images can exceed the encoder's target. Scale the pixels before retrying.
      const scale = Math.max(
        limits.minWidth / canvas.width,
        limits.minHeight / canvas.height,
        0.95 * Math.sqrt(limits.maxBytes / size),
      );
      const width = Math.round(canvas.width * scale);
      const height = Math.round(canvas.height * scale);
      if (width === canvas.width && height === canvas.height) throw new Error('image_too_large');
      context = drawResizedImage(canvas, width, height);
      canvas.width = 0;
      encoded = await encodeCanvas(context, tryLossless);
      size = encoded.webp.byteLength + encoded.jxl.byteLength;
    }
    return {
      files: {
        webp: new File([encoded.webp], 'building.webp', { type: 'image/webp' }),
        jxl: new File([encoded.jxl], 'building.jxl', { type: 'image/jxl' }),
        thumbnailWebp: new File([encoded.thumbnailWebp], 'thumbnail.webp', { type: 'image/webp' }),
      },
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
  thumbnail: ImageData,
  tryLossless: boolean,
  signal: AbortSignal,
) {
  const listeners = new AbortController();
  const options = { signal: listeners.signal };
  return new Promise<EncodedImage>((resolve, reject) => {
    const failed = () => reject(new Error('upload_failed'));
    signal.addEventListener('abort', () => reject(signal.reason), options);
    worker.addEventListener('error', failed, options);
    worker.addEventListener('messageerror', failed, options);
    worker.addEventListener(
      'message',
      ({ data }: MessageEvent<EncodedImage | null>) => {
        if (data) resolve(data);
        else failed();
      },
      options,
    );
    worker.postMessage({ pixels, thumbnail, tryLossless }, [pixels.data.buffer, thumbnail.data.buffer]);
  }).finally(() => listeners.abort());
}

export async function uploadBuildingSubmissionImageDrafts(
  images: BuildingSubmissionImageDraft[],
  account: AuthAccount,
  draftKey: string,
  signal?: AbortSignal,
): Promise<BuildingImageRef[]> {
  const uploaded: BuildingImageRef[] = [];
  for (const draft of images) {
    signal?.throwIfAborted();
    const cached = uploadedDrafts.get(draft.files);
    if (
      cached &&
      cached.draftKey === draftKey &&
      cached.owner === account.playerUuid &&
      cached.expiresAt > Date.now()
    ) {
      uploaded.push(cached.image);
      continue;
    }
    const { image, expiresAt } = await uploadImage(draft.files, draftKey, draft.id, signal);
    uploadedDrafts.set(draft.files, {
      draftKey,
      owner: account.playerUuid,
      image,
      expiresAt,
    });
    uploaded.push(image);
  }
  return uploaded;
}

async function uploadImage(
  files: BuildingSubmissionImageDraft['files'],
  draftKey: string,
  requestKey: string,
  signal?: AbortSignal,
): Promise<{ image: BuildingImageRef; expiresAt: number }> {
  const formData = new FormData();
  formData.set('webp', files.webp);
  formData.set('jxl', files.jxl);
  formData.set('thumbnailWebp', files.thumbnailWebp);
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
    !isBuildingImageRef(payload.image) ||
    typeof payload.expiresAt !== 'number' ||
    !Number.isFinite(payload.expiresAt)
  ) {
    throw new Error(isApiErrorPayload(payload) ? payload.error : 'upload_failed');
  }
  return { image: payload.image, expiresAt: payload.expiresAt };
}
