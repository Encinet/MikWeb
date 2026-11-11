'use client';

import { useEffect, useEffectEvent, useRef } from 'react';
import { isImeComposing } from '@/shared/lib/keyboard-composition';

export function useBuildingGalleryControls({
  imageIndex,
  imageCount,
  next,
  prev,
  reduceMotion,
}: {
  imageIndex: number;
  imageCount: number;
  next: () => void;
  prev: () => void;
  reduceMotion: boolean;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const thumbnailsRef = useRef<HTMLElement>(null);
  const navigate = useEffectEvent((event: KeyboardEvent) => {
    const gallery = stageRef.current?.closest('.building-archive-overlay');
    const target = event.target;
    if (
      imageCount < 2 ||
      event.defaultPrevented ||
      isImeComposing(event) ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      !window.getSelection()?.isCollapsed ||
      !(target instanceof window.Element) ||
      (target !== document.body && !gallery?.contains(target)) ||
      target.closest(
        'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="slider"], [role="menu"]',
      )
    )
      return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      if (event.key === 'ArrowLeft') prev();
      else next();
    }
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => navigate(event);
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const strip = thumbnailsRef.current;
    const active = strip?.querySelectorAll('button')[imageIndex];
    if (!strip || !active) return;
    const viewport = strip.getBoundingClientRect();
    const item = active.getBoundingClientRect();
    const left =
      item.left < viewport.left
        ? item.left - viewport.left - 4
        : item.right > viewport.right
          ? item.right - viewport.right + 4
          : 0;
    if (left) strip.scrollBy({ left, behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [imageIndex, reduceMotion]);

  return { stageRef, thumbnailsRef };
}
