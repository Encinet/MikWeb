import 'server-only';

import { createHash } from 'node:crypto';
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
  if (activeUploads >= 4) return uploadError('image_upload_busy', 503, '10');
  activeUploads++;
  try {
    // One account lookup also reserves the durable quota and prevents parallel uploads for this account.
    const draftKey = request.headers.get('X-Building-Draft');
    const requestKey = request.headers.get('X-Upload-Request');
    if (!draftKey || !requestKey) return uploadError('invalid_draft', 422);
    const authorized = await callImageUploadService(request, 'reserve', { draftKey, requestKey });
    if (!authorized.ok) return authorized;
    const {
      uploadId,
      image: previous,
      expiresAt,
    } = (await authorized.json()) as {
      uploadId?: string;
      image?: { url: string };
      expiresAt?: number;
    };
    if (previous)
      return Response.json(
        { image: previous, expiresAt },
        { headers: { 'Cache-Control': 'no-store' } },
      );
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
    const prepared = await callImageUploadService(request, 'prepare', {
      uploadId,
      hash: createHash('sha256').update(decoded.data).digest('hex'),
    });
    if (!prepared.ok) return prepared;
    const { url, put } = (await prepared.json()) as {
      url: string;
      put: { url: string; headers: Record<string, string> };
    };
    const stored = await fetch(put.url, {
      method: 'PUT',
      headers: put.headers,
      body: new Uint8Array(decoded.data),
      redirect: 'error',
      signal: AbortSignal.timeout(20_000),
    });
    await stored.body?.cancel();
    if (!stored.ok) return uploadError('image_upload_unavailable', 502);
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
