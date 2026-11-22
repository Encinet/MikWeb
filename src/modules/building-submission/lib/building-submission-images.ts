import type { AuthAccount } from '@/modules/auth/model/auth-types';
import type { BuildingSubmissionImageDraft } from '@/modules/building-submission/model/building-submission-form';
import { BUILDING_SUBMISSION_IMAGE_LIMITS } from '@/modules/building-submission/model/building-submission-limits';
import type { BuildingSubmissionImage } from '@/modules/building-submission/model/building-submission-types';
import { isBuildingSubmissionImage } from '@/modules/building-submission/model/building-submission-validation';
import { isApiErrorPayload } from '@/shared/api/api-error-payload';
import { isRecord } from '@/shared/lib/is-record';

const uploadedDrafts = new WeakMap<
  File,
  { draftKey: string; owner: string; expiresAt: number; image: BuildingSubmissionImage }
>();

export async function createBuildingSubmissionImageDraft(
  file: File,
): Promise<BuildingSubmissionImageDraft> {
  const bitmap = await createImageBitmap(file);
  const width = bitmap.width;
  const height = bitmap.height;
  bitmap.close();
  return {
    id: crypto.randomUUID(),
    file,
    previewUrl: URL.createObjectURL(file),
    width,
    height,
    size: file.size,
  };
}

export async function uploadBuildingSubmissionImageDrafts(
  images: BuildingSubmissionImageDraft[],
  account: AuthAccount,
  draftKey: string,
  signal?: AbortSignal,
): Promise<BuildingSubmissionImage[]> {
  const uploaded: BuildingSubmissionImage[] = [];
  for (const draft of images) {
    signal?.throwIfAborted();
    const cached = uploadedDrafts.get(draft.file);
    if (
      cached &&
      cached.draftKey === draftKey &&
      cached.owner === account.playerUuid &&
      cached.expiresAt > Date.now()
    ) {
      uploaded.push(cached.image);
      continue;
    }
    const converted = await convertToWebp(draft.file);
    if (
      converted.width < BUILDING_SUBMISSION_IMAGE_LIMITS.minWidth ||
      converted.height < BUILDING_SUBMISSION_IMAGE_LIMITS.minHeight
    ) {
      throw new Error('image_too_small');
    }
    signal?.throwIfAborted();
    const { image, expiresAt } = await uploadWebp(converted.file, draftKey, draft.id, signal);
    uploadedDrafts.set(draft.file, {
      draftKey,
      owner: account.playerUuid,
      image,
      expiresAt,
    });
    uploaded.push(image);
  }
  return uploaded;
}

async function convertToWebp(file: File): Promise<{ file: File; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(
    1,
    BUILDING_SUBMISSION_IMAGE_LIMITS.maxDimension / Math.max(bitmap.width, bitmap.height),
  );
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error('upload_failed');
  }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', BUILDING_SUBMISSION_IMAGE_LIMITS.webpQuality / 100),
  );
  if (!blob) throw new Error('upload_failed');
  return {
    file: new File([blob], 'building.webp', {
      type: 'image/webp',
    }),
    width,
    height,
  };
}

async function uploadWebp(
  file: File,
  draftKey: string,
  requestKey: string,
  signal?: AbortSignal,
): Promise<{ image: BuildingSubmissionImage; expiresAt: number }> {
  const formData = new FormData();
  formData.set('image', file);
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
    !isBuildingSubmissionImage(payload.image) ||
    typeof payload.expiresAt !== 'number'
  ) {
    throw new Error(isApiErrorPayload(payload) ? payload.error : 'upload_failed');
  }
  return { image: payload.image, expiresAt: payload.expiresAt };
}
