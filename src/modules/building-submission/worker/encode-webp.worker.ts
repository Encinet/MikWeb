/// <reference lib="webworker" />
import encode from '@jsquash/webp/encode.js';
import { BUILDING_SUBMISSION_IMAGE_LIMITS } from '../model/building-submission-limits';

const scope = self as unknown as DedicatedWorkerGlobalScope;

scope.onmessage = async ({ data }: MessageEvent<{ pixels: ImageData; tryLossless: boolean }>) => {
  try {
    const options = {
      quality: BUILDING_SUBMISSION_IMAGE_LIMITS.webpQuality,
      use_sharp_yuv: 1,
    };
    let output = await encode(data.pixels, options);
    if (data.tryLossless) {
      // In lossless mode quality controls compression effort.
      const lossless = await encode(data.pixels, { lossless: 1, quality: 60 });
      if (
        lossless.byteLength <=
        Math.min(output.byteLength, BUILDING_SUBMISSION_IMAGE_LIMITS.maxBytes)
      )
        output = lossless;
    }
    if (output.byteLength > BUILDING_SUBMISSION_IMAGE_LIMITS.maxBytes) {
      output = await encode(data.pixels, {
        ...options,
        // Byte budget for multipass encoding.
        target_size: BUILDING_SUBMISSION_IMAGE_LIMITS.maxBytes,
        pass: 4,
      });
    }
    scope.postMessage(output, [output]);
  } catch {
    scope.postMessage(null);
  }
};
