'use client';

import type { TouchEvent } from 'react';
import { useEffect, useEffectEvent, useRef } from 'react';

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
  const thumbnailsRef = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const navigate = useEffectEvent((event: KeyboardEvent) => {
    const gallery = stageRef.current?.closest('.building-archive-overlay');
    const target = event.target;
    if (
      imageCount < 2 ||
      event.defaultPrevented ||
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

  const cancelTouch = () => {
    touch.current = null;
  };
  const onTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    cancelTouch();
    const point = event.touches[0];
    if (
      imageCount < 2 ||
      event.touches.length !== 1 ||
      !point ||
      point.clientX < 32 ||
      point.clientX > window.innerWidth - 32 ||
      (event.target instanceof window.Element && event.target.closest('button, a'))
    )
      return;
    touch.current = { x: point.clientX, y: point.clientY };
  };
  const onTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    const point = event.touches[0];
    const start = touch.current;
    if (event.touches.length !== 1 || !point) cancelTouch();
    else if (
      start &&
      Math.abs(point.clientY - start.y) > Math.max(10, Math.abs(point.clientX - start.x))
    )
      cancelTouch();
  };
  const onTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const start = touch.current;
    cancelTouch();
    const end = event.changedTouches[0];
    if (!start || !end || event.touches.length) return;
    const dx = end.clientX - start.x;
    const dy = end.clientY - start.y;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0) next();
    else prev();
  };

  return {
    stageRef,
    thumbnailsRef,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel: cancelTouch,
  };
}
