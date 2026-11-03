'use client';

import { useEffect, useRef, useState } from 'react';
import { copyText } from '@/shared/lib/copy-text';

export function useCopyFeedback(value: string) {
  const [feedback, setFeedback] = useState<{
    value: string;
    status: 'idle' | 'copied' | 'error';
    copying: boolean;
  }>({ value, status: 'idle', copying: false });
  const operationRef = useRef(0);
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setFeedback({ value, status: 'idle', copying: false });
    return () => {
      operationRef.current++;
      if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current);
    };
  }, [value]);

  const copy = async () => {
    if (feedback.value === value && feedback.copying) return false;
    const operation = ++operationRef.current;
    if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current);
    setFeedback({ value, status: 'idle', copying: true });
    const success = await copyText(value);
    if (operation !== operationRef.current) return false;
    setFeedback({ value, status: success ? 'copied' : 'error', copying: false });
    resetTimerRef.current = window.setTimeout(
      () => setFeedback({ value, status: 'idle', copying: false }),
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
