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

scope.onmessage = async ({ data }: MessageEvent<{ pixels: ImageData; tryLossless: boolean }>) => {
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
    scope.postMessage({ webp: output, jxl }, [output, jxl]);
  } catch {
    scope.postMessage(null);
  }
};
