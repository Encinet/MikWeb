import { readAccountSummaryFromCookies } from '@/modules/auth/server/auth-bff';

export const dynamic = 'force-dynamic';

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export async function POST(request: Request) {
  const auth = await readAccountSummaryFromCookies(request);
  if (!auth.account) {
    return (
      auth.response ??
      Response.json(
        { error: 'unauthenticated' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } },
      )
    );
  }

  const apiKey = process.env.IMGBB_API_KEY?.trim();
  if (!apiKey) {
    return Response.json(
      { error: 'image_upload_not_configured', detail: 'IMGBB_API_KEY is not configured.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const formData = await request.formData().catch(() => null);
  const image = formData?.get('image');
  if (!(image instanceof File)) {
    return Response.json(
      { error: 'image_required' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  if (image.type !== 'image/webp') {
    return Response.json(
      { error: 'image_must_be_webp' },
      { status: 415, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  if (image.size <= 0 || image.size > MAX_UPLOAD_BYTES) {
    return Response.json(
      { error: 'image_too_large', maxBytes: MAX_UPLOAD_BYTES },
      { status: 413, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const upstreamForm = new FormData();
  upstreamForm.set('key', apiKey);
  upstreamForm.set('image', image, sanitizeImageName(image.name));

  let upstream: Response;
  try {
    upstream = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: upstreamForm,
      cache: 'no-store',
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return Response.json(
      { error: 'image_upload_unavailable' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const payload = (await upstream.json().catch(() => ({}))) as ImgBbResponse;
  if (!upstream.ok || !payload.success || !payload.data) {
    return Response.json(
      { error: 'image_upload_failed' },
      { status: upstream.status || 502, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const imageUrl = payload.data.image?.url ?? payload.data.url;
  const width = Number(payload.data.width);
  const height = Number(payload.data.height);
  const size = Number(payload.data.size);
  const mime = payload.data.image?.mime ?? 'image/webp';

  if (!imageUrl || !Number.isFinite(width) || !Number.isFinite(height) || !Number.isFinite(size)) {
    return Response.json(
      { error: 'invalid_image_upload_response' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  return Response.json(
    {
      image: {
        url: imageUrl,
        displayUrl: readStringField(payload.data, 'display_url') ?? imageUrl,
        width,
        height,
        size,
        mime,
      },
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

interface ImgBbResponse {
  success?: boolean;
  data?: {
    url?: string;
    width?: string | number;
    height?: string | number;
    size?: string | number;
    image?: {
      url?: string;
      mime?: string;
    };
  };
}

function readStringField(value: Record<string, unknown>, key: string): string | undefined {
  const field = value[key];
  return typeof field === 'string' ? field : undefined;
}

function sanitizeImageName(name: string): string {
  const clean = name
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .slice(0, 48);
  return `${clean || 'building'}.webp`;
}
