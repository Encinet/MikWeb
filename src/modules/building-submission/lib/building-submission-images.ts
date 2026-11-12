import type { AuthAccount } from '@/modules/auth/model/auth-types';
import type { BuildingSubmissionImageDraft } from '@/modules/building-submission/model/building-submission-form';
import { BUILDING_SUBMISSION_IMAGE_LIMITS } from '@/modules/building-submission/model/building-submission-limits';
import type { BuildingSubmissionImage } from '@/modules/building-submission/model/building-submission-types';
import { isBuildingSubmissionImage } from '@/modules/building-submission/model/building-submission-validation';
import { isApiErrorPayload } from '@/shared/api/api-error-payload';
import { isRecord } from '@/shared/lib/is-record';

const uploadedDrafts = new WeakMap<
  File,
  { owner: string; expiresAt: number; image: BuildingSubmissionImage }
>();

export async function createBuildingSubmissionImageDraft(
  file: File,
): Promise<BuildingSubmissionImageDraft> {
  const bitmap = await createImageBitmap(file);
  const width = bitmap.width;
  const height = bitmap.height;
  bitmap.close();
  return {
    id: `${Date.now().toString(36)}-${crypto.randomUUID()}`,
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
  buildingEnglishName: string,
  signal?: AbortSignal,
): Promise<BuildingSubmissionImage[]> {
  const uploaded: BuildingSubmissionImage[] = [];
  for (let index = 0; index < images.length; index += 1) {
    signal?.throwIfAborted();
    const cached = uploadedDrafts.get(images[index].file);
    if (cached && cached.owner === account.playerUuid && cached.expiresAt > Date.now()) {
      uploaded.push(cached.image);
      continue;
    }
    const outputName = buildImageFileName(
      account.currentName,
      buildingEnglishName,
      index + 1,
      images.length,
    );
    const converted = await convertToWebp(images[index].file, outputName);
    if (
      converted.width < BUILDING_SUBMISSION_IMAGE_LIMITS.minWidth ||
      converted.height < BUILDING_SUBMISSION_IMAGE_LIMITS.minHeight
    ) {
      throw new Error('image_too_small');
    }
    signal?.throwIfAborted();
    const image = await uploadWebp(converted.file, signal);
    uploadedDrafts.set(images[index].file, {
      owner: account.playerUuid,
      image,
      expiresAt: Date.now() + 23 * 3600_000,
    });
    uploaded.push(image);
  }
  return uploaded;
}

async function convertToWebp(
  file: File,
  outputName: string,
): Promise<{ file: File; width: number; height: number }> {
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
    file: new File([blob], outputName, {
      type: 'image/webp',
    }),
    width,
    height,
  };
}

function buildImageFileName(
  playerName: string,
  buildingEnglishName: string,
  imageNumber: number,
  totalImageCount: number,
): string {
  const player = sanitizeFileNamePart(playerName, 'player');
  const building = sanitizeFileNamePart(buildingEnglishName, 'building');
  const suffix = totalImageCount === 1 ? '' : `_${imageNumber}`;
  return `${player}_${building}${suffix}.webp`;
}

function sanitizeFileNamePart(value: string, fallback: string): string {
  const clean = value
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '')
    .slice(0, 64);
  return clean || fallback;
}

async function uploadWebp(file: File, signal?: AbortSignal): Promise<BuildingSubmissionImage> {
  const formData = new FormData();
  formData.set('image', file);
  const response = await fetch('/api/account/images/upload', {
    method: 'POST',
    body: formData,
    signal,
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok || !isRecord(payload) || !isBuildingSubmissionImage(payload.image)) {
    throw new Error(isApiErrorPayload(payload) ? payload.error : 'upload_failed');
  }
  return payload.image;
}
