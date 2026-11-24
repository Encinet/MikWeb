'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  getBuildingShareData,
  getBuildingSocialImagePath,
} from '@/modules/building/lib/building-links';
import type { LocalizedBuilding } from '@/modules/building/model/building-types';
import { useHasMounted } from '@/shared/hooks/use-has-mounted';
import { canNativeShare, isShareCancellation } from '@/shared/lib/native-share';
import { readLimitedResponse } from '@/shared/lib/read-limited-response';
import { withRequestTimeout } from '@/shared/lib/request-timeout';

const MAX_SHARE_CARD_BYTES = 10 * 1024 * 1024;

async function fetchShareCard(url: string, filename: string, signal: AbortSignal) {
  const response = await fetch(url, { signal });
  const type = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  if (!response.ok || type !== 'image/png') {
    await response.body?.cancel().catch(() => {});
    throw new Error('Card unavailable');
  }
  const bytes = await readLimitedResponse(response, MAX_SHARE_CARD_BYTES);
  if (bytes.byteLength === 0) throw new Error('Card unavailable');
  return new File([bytes], filename, { type: 'image/png' });
}

export function useBuildingCardShare(building: LocalizedBuilding, locale: string) {
  const url = getBuildingSocialImagePath(building.id, locale);
  const filename = `${building.id}-${locale}.png`;
  const mounted = useHasMounted();
  const supported = useMemo(
    () => mounted && canNativeShare({ files: [new File([], filename, { type: 'image/png' })] }),
    [mounted, filename],
  );
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<'preparing' | 'sharing' | null>(null);
  const [failed, setFailed] = useState(false);
  const scope = useRef<{ url: string; controller: AbortController; pending: boolean } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    scope.current = { url, controller, pending: false };
    setFile(null);
    setBusy(null);
    setFailed(false);
    return () => controller.abort();
  }, [url]);

  const ready = file?.name === filename;
  const prepareOrShare = async () => {
    const selection = scope.current;
    if (!supported || selection?.url !== url || selection.pending) return;
    const { signal } = selection.controller;
    if (signal.aborted) return;
    selection.pending = true;
    setFailed(false);
    setBusy(ready ? 'sharing' : 'preparing');
    try {
      const { title } = getBuildingShareData(building, locale);
      if (ready && file) {
        // File sharing needs a fresh click after the download completes.
        await navigator.share({ title, files: [file] });
      } else {
        const png = await withRequestTimeout(
          15_000,
          (requestSignal) => fetchShareCard(url, filename, requestSignal),
          signal,
        );
        if (!canNativeShare({ title, files: [png] })) throw new Error('Card unavailable');
        if (!signal.aborted) setFile(png);
      }
    } catch (error) {
      if (!signal.aborted && !(ready && isShareCancellation(error))) setFailed(true);
    } finally {
      selection.pending = false;
      if (!signal.aborted) setBusy(null);
    }
  };

  return { url, filename, supported, ready, busy, prepareOrShare, failed };
}
