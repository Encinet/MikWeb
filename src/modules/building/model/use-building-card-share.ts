'use client';

import { useEffect, useRef, useState } from 'react';
import {
  getBuildingShareData,
  getBuildingSocialImagePath,
} from '@/modules/building/lib/building-links';
import type { Building } from '@/modules/building/model/building-types';
import { canNativeShare, isShareCancellation } from '@/shared/lib/native-share';
import { readLimitedResponse } from '@/shared/lib/read-limited-response';
import { withRequestTimeout } from '@/shared/lib/request-timeout';

const MAX_SHARE_CARD_BYTES = 10 * 1024 * 1024;

export function useBuildingCardShare(building: Building, locale: string) {
  const url = getBuildingSocialImagePath(building.id, locale);
  const filename = `${building.id}-${locale}.png`;
  const data = getBuildingShareData(building, locale);
  const [prepared, setPrepared] = useState<{ url: string; filename: string; file: File } | null>(
    null,
  );
  const [preparingUrl, setPreparingUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const pending = useRef(false);
  const preparation = useRef<AbortController | null>(null);

  useEffect(() => {
    // The card belongs to the building and locale; changing photos does not prepare it again.
    setPrepared(null);
    setFailedUrl(null);
    setPreparingUrl(null);
    if (typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') return;
    const controller = new AbortController();
    preparation.current = controller;
    setPreparingUrl(url);
    const prepare = async () => {
      try {
        const file = await withRequestTimeout(
          15_000,
          async (signal) => {
            const response = await fetch(url, { signal });
            const type =
              response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() ?? '';
            if (!response.ok || type !== 'image/png') {
              await response.body?.cancel().catch(() => {});
              throw new Error('Card unavailable');
            }
            const bytes = await readLimitedResponse(response, MAX_SHARE_CARD_BYTES);
            if (bytes.byteLength === 0) throw new Error('Card unavailable');
            return new File([bytes], filename, { type: 'image/png' });
          },
          controller.signal,
        );
        if (!controller.signal.aborted) setPrepared({ url, filename, file });
      } catch {
        if (!controller.signal.aborted) setFailedUrl(url);
      } finally {
        if (!controller.signal.aborted) setPreparingUrl(null);
      }
    };
    void prepare();
    return () => controller.abort();
  }, [url, filename]);

  const file =
    prepared && prepared.url === url && prepared.filename === filename ? prepared.file : null;
  const payload = file ? { title: data.title, files: [file] } : null;
  const ready = payload !== null && canNativeShare(payload);
  const share = async () => {
    if (!ready || !payload || pending.current) return;
    const selection = preparation.current;
    pending.current = true;
    setSharing(true);
    setFailedUrl(null);
    try {
      // Preparing before the click preserves the user gesture required by native sharing.
      await navigator.share(payload);
    } catch (error) {
      if (!selection?.signal.aborted && !isShareCancellation(error)) setFailedUrl(url);
    } finally {
      pending.current = false;
      setSharing(false);
    }
  };
  return {
    url,
    filename,
    ready,
    preparing: preparingUrl === url,
    share,
    sharing,
    failed: failedUrl === url,
  };
}
