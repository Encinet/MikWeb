import 'server-only';

import type { OutputInfo } from 'sharp';
import sharp from 'sharp';
import { callImageUploadService } from '@/modules/auth/server/auth-bff';
import { BUILDING_SUBMISSION_IMAGE_LIMITS } from '@/modules/building-submission/model/building-submission-limits';
import {
  RequestBodyLimitError,
  readLimitedRequestBody,
} from '@/shared/server/limited-request-body';

const MAX_UPLOAD_BYTES = BUILDING_SUBMISSION_IMAGE_LIMITS.maxBytes;
const MAX_MULTIPART_BYTES = MAX_UPLOAD_BYTES + 16 * 1024;
let activeUploads = 0;

export async function uploadBuildingSubmissionImage(request: Request): Promise<Response> {
  const apiKey = process.env.IMGBB_API_KEY?.trim();
  if (!apiKey) return uploadError('image_upload_not_configured', 503);
  if (activeUploads >= 4) return uploadError('image_upload_busy', 503, '10');
  activeUploads++;
  try {
    // One account lookup also reserves the durable quota and prevents parallel uploads for this account.
    const authorized = await callImageUploadService(request, 'reserve');
    if (!authorized.ok) return authorized;
    const { uploadId } = (await authorized.json()) as { uploadId?: string };
    if (typeof uploadId !== 'string') return uploadError('image_upload_unavailable', 502);
    if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('multipart/form-data;')) {
      return uploadError('multipart_required', 415);
    }
    const body = await readLimitedRequestBody(request, MAX_MULTIPART_BYTES);
    const form = await new Response(body as BodyInit, {
      headers: { 'Content-Type': request.headers.get('Content-Type') ?? '' },
    }).formData();
    const image = form.get('image');
    if (!(image instanceof File) || [...form.keys()].length !== 1)
      return uploadError('image_required', 400);
    if (image.type !== 'image/webp') return uploadError('image_must_be_webp', 415);
    if (image.size <= 0 || image.size > MAX_UPLOAD_BYTES)
      return uploadError('image_too_large', 413);
    const input = Buffer.from(await image.arrayBuffer());
    if (input.toString('ascii', 0, 4) !== 'RIFF' || input.toString('ascii', 8, 12) !== 'WEBP') {
      return uploadError('invalid_image', 422);
    }
    let decoded: { data: Buffer; info: OutputInfo };
    try {
      const decoder = sharp(input, {
        failOn: 'warning',
        limitInputPixels: BUILDING_SUBMISSION_IMAGE_LIMITS.maxDimension ** 2,
      });
      const metadata = await decoder.metadata();
      if (
        metadata.format !== 'webp' ||
        (metadata.pages ?? 1) !== 1 ||
        !metadata.width ||
        !metadata.height ||
        metadata.width < BUILDING_SUBMISSION_IMAGE_LIMITS.minWidth ||
        metadata.height < BUILDING_SUBMISSION_IMAGE_LIMITS.minHeight ||
        metadata.width > BUILDING_SUBMISSION_IMAGE_LIMITS.maxDimension ||
        metadata.height > BUILDING_SUBMISSION_IMAGE_LIMITS.maxDimension
      ) {
        return uploadError('invalid_image_dimensions', 422);
      }
      // Decode the entire image and strip metadata before it reaches the hosting service.
      decoded = await decoder
        .webp({ quality: BUILDING_SUBMISSION_IMAGE_LIMITS.webpQuality, effort: 3 })
        .toBuffer({ resolveWithObject: true });
    } catch {
      return uploadError('invalid_image', 422);
    }
    if (decoded.data.length > MAX_UPLOAD_BYTES) return uploadError('image_too_large', 413);
    const upstreamForm = new FormData();
    upstreamForm.set('key', apiKey);
    upstreamForm.set(
      'image',
      new Blob([new Uint8Array(decoded.data)], { type: 'image/webp' }),
      sanitizeImageName(image.name),
    );
    const upstream = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: upstreamForm,
      cache: 'no-store',
      signal: AbortSignal.timeout(20_000),
    });
    const payload = (await upstream.json()) as ImgBbResponse;
    const url = payload.data?.image?.url ?? payload.data?.url;
    if (
      !upstream.ok ||
      !payload.success ||
      typeof url !== 'string' ||
      !/^https:\/\/i\.ibb\.co\/[^/]+\/[^/?#]+\.webp$/i.test(url) ||
      Number(payload.data?.width) !== decoded.info.width ||
      Number(payload.data?.height) !== decoded.info.height ||
      Number(payload.data?.size) !== decoded.data.length ||
      payload.data?.image?.mime !== 'image/webp'
    ) {
      return uploadError('invalid_image_upload_response', 502);
    }
    const receipt = {
      url,
      width: decoded.info.width,
      height: decoded.info.height,
      size: decoded.data.length,
      mime: 'image/webp',
    };
    return await callImageUploadService(request, 'complete', { uploadId, image: receipt });
  } catch (error) {
    return uploadError(
      error instanceof RequestBodyLimitError ? 'image_too_large' : 'image_upload_unavailable',
      error instanceof RequestBodyLimitError ? 413 : 502,
    );
  } finally {
    activeUploads--;
  }
}

interface ImgBbResponse {
  success?: boolean;
  data?: {
    url?: string;
    width?: string | number;
    height?: string | number;
    size?: string | number;
    image?: { url?: string; mime?: string };
  };
}
function uploadError(error: string, status: number, retryAfter?: string): Response {
  return Response.json(
    { error },
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
        ...(retryAfter ? { 'Retry-After': retryAfter } : {}),
      },
    },
  );
}
function sanitizeImageName(name: string): string {
  const clean = name
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .slice(0, 48);
  return `${clean || 'building'}.webp`;
}
