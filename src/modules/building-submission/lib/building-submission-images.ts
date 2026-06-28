import type { AuthAccount } from '@/modules/auth/model/auth-types';
import type { BuildingSubmissionImageDraft } from '@/modules/building-submission/model/building-submission-form';
import {
  MIN_BUILDING_SUBMISSION_IMAGE_HEIGHT,
  MIN_BUILDING_SUBMISSION_IMAGE_WIDTH,
} from '@/modules/building-submission/model/building-submission-form';
import type { BuildingSubmissionImage } from '@/modules/building-submission/model/building-submission-types';

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
): Promise<BuildingSubmissionImage[]> {
  const uploaded: BuildingSubmissionImage[] = [];
  for (let index = 0; index < images.length; index += 1) {
    const outputName = buildImageFileName(
      account.currentName,
      buildingEnglishName,
      index + 1,
      images.length,
    );
    const converted = await convertToWebp(images[index].file, outputName);
    if (
      converted.width < MIN_BUILDING_SUBMISSION_IMAGE_WIDTH ||
      converted.height < MIN_BUILDING_SUBMISSION_IMAGE_HEIGHT
    ) {
      throw new Error('image_too_small');
    }
    uploaded.push(await uploadWebp(converted.file));
  }
  return uploaded;
}

async function convertToWebp(
  file: File,
  outputName: string,
): Promise<{ file: File; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('upload_failed');
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', 0.86),
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

async function uploadWebp(file: File): Promise<BuildingSubmissionImage> {
  const formData = new FormData();
  formData.set('image', file);
  const response = await fetch('/api/account/images/upload', {
    method: 'POST',
    body: formData,
  });
  const payload = (await response.json().catch(() => ({}))) as { image?: BuildingSubmissionImage };
  if (!response.ok || !payload.image) throw new Error('upload_failed');
  return payload.image;
}
