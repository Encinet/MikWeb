'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { copyText } from '@/shared/lib/copy-text';

export function useCopyFeedback(value: string) {
  const [feedback, setFeedback] = useState<{
    value: string;
    status: 'idle' | 'copied' | 'error';
    copying: boolean;
  }>({ value, status: 'idle', copying: false });
  const operationRef = useRef(0);
  const copyingRef = useRef(false);
  const resetTimerRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    setFeedback({ value, status: 'idle', copying: false });
    return () => {
      operationRef.current++;
      copyingRef.current = false;
      if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
      setFeedback({ value, status: 'idle', copying: false });
    };
  }, [value]);

  const copy = async () => {
    if (copyingRef.current) return false;
    copyingRef.current = true;
    const operation = ++operationRef.current;
    if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current);
    setFeedback({ value, status: 'idle', copying: true });
    const success = await copyText(value);
    if (operation !== operationRef.current) return false;
    copyingRef.current = false;
    setFeedback({ value, status: success ? 'copied' : 'error', copying: false });
    resetTimerRef.current = window.setTimeout(
      () => {
        resetTimerRef.current = null;
        setFeedback({ value, status: 'idle', copying: false });
      },
      success ? 1800 : 4000,
    );
    return success;
  };

  return {
    status: feedback.value === value ? feedback.status : 'idle',
    copying: feedback.value === value && feedback.copying,
    copy,
  };
}
