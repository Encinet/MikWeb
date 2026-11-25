import 'server-only';

import { createHash } from 'node:crypto';
import type { BuildingImageRef } from '@/modules/building/model/building-types';
import { callImageUploadService } from '@/modules/auth/server/auth-bff';
import { pixelOnlyWebpDimensions } from '@/modules/building-submission/lib/is-pixel-only-webp';
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
    const contentType = request.headers.get('Content-Type');
    if (!contentType?.toLowerCase().startsWith('multipart/form-data;')) {
      return uploadError('multipart_required', 415);
    }
    const authorized = await callImageUploadService(request, 'reserve', { draftKey, requestKey });
    if (!authorized.ok) return authorized;
    const {
      uploadId,
      image,
      expiresAt,
    } = (await authorized.json()) as {
      uploadId?: string;
      image?: BuildingImageRef;
      expiresAt?: number;
    };
    if (image)
      return Response.json({ image, expiresAt }, { headers: { 'Cache-Control': 'no-store' } });
    if (typeof uploadId !== 'string') return uploadError('image_upload_unavailable', 502);
    const body = await readLimitedRequestBody(request, MAX_MULTIPART_BYTES);
    const form = await new Response(body as BodyInit, {
      headers: { 'Content-Type': contentType },
    }).formData();
    const webp = form.get('webp');
    const jxl = form.get('jxl');
    if (!(webp instanceof File) || !(jxl instanceof File) || [...form.keys()].length !== 2)
      return uploadError('image_required', 400);
    if (webp.type !== 'image/webp' || (jxl.type && jxl.type !== 'image/jxl'))
      return uploadError('invalid_image', 415);
    if (!webp.size || !jxl.size || webp.size + jxl.size > MAX_UPLOAD_BYTES)
      return uploadError('image_too_large', 413);
    const variants = {
      webp: new Uint8Array(await webp.arrayBuffer()),
      jxl: new Uint8Array(await jxl.arrayBuffer()),
    };
    const dimensions = pixelOnlyWebpDimensions(variants.webp);
    if (!dimensions || variants.jxl[0] !== 0xff || variants.jxl[1] !== 0x0a)
      return uploadError('invalid_image', 422);
    const { minWidth, minHeight, maxDimension } = BUILDING_SUBMISSION_IMAGE_LIMITS;
    const { width, height } = dimensions;
    if (width < minWidth || height < minHeight || width > maxDimension || height > maxDimension)
      return uploadError('invalid_image_dimensions', 422);
    const hashes = {
      webp: createHash('sha256').update(variants.webp).digest('hex'),
      jxl: createHash('sha256').update(variants.jxl).digest('hex'),
    };
    const prepared = await callImageUploadService(request, 'prepare', { uploadId, hashes });
    if (!prepared.ok) return prepared;
    const { put } = (await prepared.json()) as {
      put: Record<'webp' | 'jxl', { url: string; headers: Record<string, string> }>;
    };
    const uploads = await Promise.allSettled((['webp', 'jxl'] as const).map(async (format) => {
      const stored = await fetch(put[format].url, {
        method: 'PUT',
        headers: put[format].headers,
        body: variants[format],
        redirect: 'error',
        signal: AbortSignal.timeout(20_000),
      });
      await stored.body?.cancel();
      return stored.ok;
    }));
    if (uploads.some((upload) => upload.status === 'rejected' || !upload.value))
      return uploadError('image_upload_unavailable', 502);
    return await callImageUploadService(request, 'complete', {
      uploadId,
      sizes: { webp: variants.webp.length, jxl: variants.jxl.length },
    });
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
