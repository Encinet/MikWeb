/// <reference lib="webworker" />
import createJxlEncoder from '@jsquash/jxl/codec/enc/jxl_enc.js';
import { defaultOptions as defaultJxlOptions } from '@jsquash/jxl/meta.js';
import encodeWebp from '@jsquash/webp/encode.js';
import { BUILDING_SUBMISSION_IMAGE_LIMITS } from '../model/building-submission-limits';

const scope = self as unknown as DedicatedWorkerGlobalScope;
let jxlEncoder: ReturnType<typeof createJxlEncoder> | undefined;

async function encodeJxl({ data, width, height }: ImageData, quality: number) {
  jxlEncoder ??= createJxlEncoder();
  const encoded = (await jxlEncoder).encode(data, width, height, {
    ...defaultJxlOptions, effort: 3, quality, progressive: true,
  });
  if (!encoded) throw new Error('JPEG XL encoding failed');
  return encoded.slice().buffer;
}

async function encodeThumbnail(pixels: ImageData) {
  let thumbnail = await encodeWebp(pixels, { quality: 72, alpha_quality: 80 });
  if (thumbnail.byteLength <= BUILDING_SUBMISSION_IMAGE_LIMITS.thumbnailBytes) return thumbnail;

  // Noisy transparent images may exceed the byte budget even at low colour quality.
  const source = new OffscreenCanvas(pixels.width, pixels.height);
  source.getContext('2d')!.putImageData(pixels, 0, 0);
  const small = new OffscreenCanvas(pixels.width, pixels.height);
  while (thumbnail.byteLength > BUILDING_SUBMISSION_IMAGE_LIMITS.thumbnailBytes) {
    small.width = Math.max(1, Math.floor(small.width / 2));
    small.height = Math.max(1, Math.floor(small.height / 2));
    const context = small.getContext('2d')!;
    context.drawImage(source, 0, 0, small.width, small.height);
    thumbnail = await encodeWebp(context.getImageData(0, 0, small.width, small.height), { quality: 72, alpha_quality: 80 });
  }
  return thumbnail;
}

scope.onmessage = async ({ data }: MessageEvent<{ pixels: ImageData; thumbnail: ImageData; tryLossless: boolean }>) => {
  try {
    const options = {
      quality: BUILDING_SUBMISSION_IMAGE_LIMITS.webpQuality,
      use_sharp_yuv: 1,
    };
    let output = await encodeWebp(data.pixels, options);
    if (data.tryLossless) {
      // In lossless mode quality controls compression effort.
      const lossless = await encodeWebp(data.pixels, { lossless: 1, quality: 60 });
      if (
        lossless.byteLength <=
        Math.min(output.byteLength, BUILDING_SUBMISSION_IMAGE_LIMITS.maxBytes)
      )
        output = lossless;
    }
    if (output.byteLength > BUILDING_SUBMISSION_IMAGE_LIMITS.maxBytes) {
      output = await encodeWebp(data.pixels, {
        ...options,
        // Byte budget for multipass encoding.
        target_size: BUILDING_SUBMISSION_IMAGE_LIMITS.maxBytes,
        pass: 4,
      });
    }
    let jxl = await encodeJxl(data.pixels, 90);
    if (jxl.byteLength + output.byteLength > BUILDING_SUBMISSION_IMAGE_LIMITS.maxBytes) {
      jxl = await encodeJxl(data.pixels, 72);
    }
    const thumbnailWebp = await encodeThumbnail(data.thumbnail);
    scope.postMessage({ webp: output, jxl, thumbnailWebp }, [output, jxl, thumbnailWebp]);
  } catch {
    scope.postMessage(null);
  }
};
