import 'server-only';

import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { callImageUploadService } from '@/modules/auth/server/auth-bff';
import { isPixelOnlyWebp } from '@/modules/building-submission/lib/is-pixel-only-webp';
import { BUILDING_SUBMISSION_IMAGE_LIMITS } from '@/modules/building-submission/model/building-submission-limits';
import {
  RequestBodyLimitError,
  readLimitedRequestBody,
} from '@/shared/server/limited-request-body';

const MAX_UPLOAD_BYTES = BUILDING_SUBMISSION_IMAGE_LIMITS.maxBytes;
const MAX_MULTIPART_BYTES = MAX_UPLOAD_BYTES + 16 * 1024;
// Only server-verified byte digests and dimensions are shared across requests.
const validatedWebps = new Set<string>();
const MAX_VALIDATED_WEBPS = 256;
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
      filename,
      expiresAt,
    } = (await authorized.json()) as {
      uploadId?: string;
      filename?: string;
      expiresAt?: number;
    };
    if (filename)
      return Response.json({ filename, expiresAt }, { headers: { 'Cache-Control': 'no-store' } });
    if (typeof uploadId !== 'string') return uploadError('image_upload_unavailable', 502);
    const body = await readLimitedRequestBody(request, MAX_MULTIPART_BYTES);
    const form = await new Response(body as BodyInit, {
      headers: { 'Content-Type': contentType },
    }).formData();
    const image = form.get('image');
    if (!(image instanceof File) || [...form.keys()].length !== 1)
      return uploadError('image_required', 400);
    if (image.type !== 'image/webp') return uploadError('image_must_be_webp', 415);
    if (image.size <= 0 || image.size > MAX_UPLOAD_BYTES)
      return uploadError('image_too_large', 413);
    const input = Buffer.from(await image.arrayBuffer());
    const result = await validateWebp(input);
    if (result instanceof Response) return result;
    const { data, hash } = result;
    const prepared = await callImageUploadService(request, 'prepare', { uploadId, hash });
    if (!prepared.ok) return prepared;
    const { put } = (await prepared.json()) as {
      put: { url: string; headers: Record<string, string> };
    };
    const stored = await fetch(put.url, {
      method: 'PUT',
      headers: put.headers,
      body: new Uint8Array(data),
      redirect: 'error',
      signal: AbortSignal.timeout(20_000),
    });
    await stored.body?.cancel();
    if (!stored.ok) return uploadError('image_upload_unavailable', 502);
    return await callImageUploadService(request, 'complete', { uploadId, size: data.length });
  } catch (error) {
    return uploadError(
      error instanceof RequestBodyLimitError ? 'image_too_large' : 'image_upload_unavailable',
      error instanceof RequestBodyLimitError ? 413 : 502,
    );
  } finally {
    activeUploads--;
  }
}

async function validateWebp(input: Buffer) {
  if (input.toString('ascii', 0, 4) !== 'RIFF' || input.toString('ascii', 8, 12) !== 'WEBP')
    return uploadError('invalid_image', 422);
  const hash = createHash('sha256').update(input).digest('hex');
  if (validatedWebps.has(hash)) return { data: input, hash };

  const limits = BUILDING_SUBMISSION_IMAGE_LIMITS;
  try {
    const decoder = sharp(input, { failOn: 'warning', limitInputPixels: limits.maxDimension ** 2 });
    const metadata = await decoder.metadata();
    const { width, height } = metadata.autoOrient;
    if (
      metadata.format !== 'webp' ||
      (metadata.pages ?? 1) !== 1 ||
      width < limits.minWidth ||
      height < limits.minHeight ||
      width > limits.maxDimension ||
      height > limits.maxDimension
    )
      return uploadError('invalid_image_dimensions', 422);
    if (isPixelOnlyWebp(input)) {
      await decoder.raw().toBuffer();
      if (validatedWebps.size >= MAX_VALIDATED_WEBPS) {
        const oldest = validatedWebps.keys().next().value;
        if (oldest !== undefined) validatedWebps.delete(oldest);
      }
      validatedWebps.add(hash);
      return { data: input, hash };
    }
    const data = await decoder
      .autoOrient()
      .webp({ quality: limits.webpQuality, smartSubsample: true })
      .toBuffer();
    if (data.length > MAX_UPLOAD_BYTES) return uploadError('image_too_large', 413);
    return { data, hash: createHash('sha256').update(data).digest('hex') };
  } catch {
    return uploadError('invalid_image', 422);
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
