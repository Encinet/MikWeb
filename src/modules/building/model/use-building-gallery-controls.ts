'use client';

import { useEffect, useEffectEvent, useRef, useState } from 'react';
import type { BuildingImageUrls } from '@/modules/building/model/building-types';
import { isImeComposing } from '@/shared/lib/keyboard-composition';

export function useBuildingGalleryControls({
  imageIndex,
  images,
  next,
  prev,
  reduceMotion,
}: {
  imageIndex: number;
  images: BuildingImageUrls[];
  next: () => void;
  prev: () => void;
  reduceMotion: boolean;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const thumbnailsRef = useRef<HTMLElement>(null);
  const [seenThumbnails, setSeenThumbnails] = useState<Set<string>>(() => new Set());
  const navigate = useEffectEvent((event: KeyboardEvent) => {
    const gallery = stageRef.current?.closest('.building-archive-overlay');
    const target = event.target;
    if (
      images.length < 2 ||
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

  useEffect(() => {
    const strip = thumbnailsRef.current;
    if (!strip) return;
    const buttons = strip.querySelectorAll<HTMLButtonElement>('[data-thumbnail]');
    if (!buttons.length) return;
    function markSeen(thumbnails: string[]) {
      setSeenThumbnails((previous) => new Set([...previous, ...thumbnails]));
    }
    if (typeof IntersectionObserver === 'undefined') {
      markSeen(Array.from(buttons, (button) => button.dataset.thumbnail!));
      return;
    }
    // Native lazy loading may start requests for the entire horizontal strip.
    const observer = new IntersectionObserver((entries) => {
      const seen: string[] = [];
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const button = entry.target as HTMLButtonElement;
        seen.push(button.dataset.thumbnail!);
        observer.unobserve(button);
      }
      if (seen.length) markSeen(seen);
    }, { root: strip });
    for (const button of buttons) observer.observe(button);
    return () => observer.disconnect();
  }, [images]);

  return { stageRef, thumbnailsRef, seenThumbnails };
}
