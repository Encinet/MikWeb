'use client';

import { useEffect, useRef, useState } from 'react';
import { getBuildingShareData } from '@/modules/building/lib/building-links';
import type { Building } from '@/modules/building/model/building-types';
import { useCopyFeedback } from '@/shared/hooks/use-copy-feedback';
import { useHasMounted } from '@/shared/hooks/use-has-mounted';
import { canNativeShare, isShareCancellation } from '@/shared/lib/native-share';

export function useBuildingShare(building: Building, locale: string) {
  const data = getBuildingShareData(building, locale);
  const link = data.url ?? '';
  const clipboard = useCopyFeedback(link);
  const mounted = useHasMounted();
  const [sharing, setSharing] = useState(false);
  const [shareUnavailable, setShareUnavailable] = useState(false);
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const pending = useRef(false);
  const scope = useRef<{ link: string } | null>(null);
  useEffect(() => {
    scope.current = { link };
    setFallbackOpen(false);
    setShareUnavailable(false);
    return () => {
      scope.current = null;
    };
  }, [link]);
  // Validate support locally; only the click handler opens native sharing.
  const canShare = mounted && !shareUnavailable && canNativeShare(data);

  const copy = async () => {
    const operationScope = scope.current;
    const success = await clipboard.copy();
    if (operationScope === scope.current) setFallbackOpen(!success);
    return success;
  };

  const share = async () => {
    if (pending.current) return;
    setFallbackOpen(false);
    if (!canShare) {
      await copy();
      return;
    }
    pending.current = true;
    const operationScope = scope.current;
    setSharing(true);
    try {
      // Keep this call in the click gesture; Safari consumes transient activation.
      await navigator.share(data);
    } catch (error) {
      if (operationScope === scope.current && !isShareCancellation(error)) {
        setShareUnavailable(true);
      }
    } finally {
      pending.current = false;
      setSharing(false);
    }
  };

  return {
    ...clipboard,
    copy,
    link,
    share,
    sharing,
    canShare,
    fallbackOpen,
    dismissFallback: () => setFallbackOpen(false),
  };
}
