'use client';

import { useEffect, useRef, useState } from 'react';
import { canNativeShare, isShareCancellation } from '@/shared/lib/native-share';
import { readLimitedResponse } from '@/shared/lib/read-limited-response';
import { withRequestTimeout } from '@/shared/lib/request-timeout';

const MAX_SHARE_IMAGE_BYTES = 10 * 1024 * 1024;
export function useBuildingImageShare(url: string | undefined, filename: string, data: ShareData) {
  const [prepared, setPrepared] = useState<{ url: string; filename: string; file: File } | null>(
    null,
  );
  const [sharing, setSharing] = useState(false);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const pending = useRef(false);
  const preparation = useRef<AbortController | null>(null);

  useEffect(() => {
    // Release the previous binary when the selection changes or details are collapsed.
    setPrepared(null);
    setFailedUrl(null);
    if (!url || typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function')
      return;
    const controller = new AbortController();
    preparation.current = controller;
    const prepare = async () => {
      try {
        const file = await withRequestTimeout(
          15_000,
          async (signal) => {
            const response = await fetch(url, { signal });
            const type =
              response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() ?? '';
            // The same-origin image endpoint always produces JPEG.
            if (!response.ok || type !== 'image/jpeg') {
              await response.body?.cancel().catch(() => {});
              throw new Error('Image unavailable');
            }
            const bytes = await readLimitedResponse(response, MAX_SHARE_IMAGE_BYTES);
            return new File([bytes], `${filename}.jpg`, { type: 'image/jpeg' });
          },
          controller.signal,
        );
        if (!controller.signal.aborted) setPrepared({ url, filename, file });
      } catch {
        // Link sharing stays available when the image cannot be prepared.
      }
    };
    void prepare();
    return () => controller.abort();
  }, [url, filename]);

  const file =
    prepared && prepared.url === url && prepared.filename === filename ? prepared.file : null;
  const payload = file ? { ...data, files: [file] } : null;
  const ready = payload !== null && canNativeShare(payload);
  const share = async () => {
    if (!ready || !payload || pending.current) return;
    const selection = preparation.current;
    pending.current = true;
    setSharing(true);
    setFailedUrl(null);
    try {
      // The image is prepared before the click so Safari retains user activation.
      await navigator.share(payload);
    } catch (error) {
      if (!selection?.signal.aborted && !isShareCancellation(error)) setFailedUrl(url ?? null);
    } finally {
      pending.current = false;
      setSharing(false);
    }
  };
  return { ready, share, sharing, failed: Boolean(url && failedUrl === url) };
}
