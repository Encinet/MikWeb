'use client';

import type { KeyboardEvent, MouseEvent, PointerEvent } from 'react';
import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from 'react';
import type { ImageTransform } from '@/modules/building/lib/building-image-transform';
import {
  constrainImageTransform,
  INITIAL_IMAGE_TRANSFORM,
  scaleImageAtPoint,
} from '@/modules/building/lib/building-image-transform';

interface Point {
  x: number;
  y: number;
}

export function useBuildingImageZoom({
  enabled,
  imageKey,
  next,
  prev,
}: {
  enabled: boolean;
  imageKey: string | undefined;
  next: () => void;
  prev: () => void;
}) {
  const viewportRef = useRef<HTMLElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const transformRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState(INITIAL_IMAGE_TRANSFORM);
  const [smooth, setSmooth] = useState(false);
  const current = useRef(transform);
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<{
    start: Point;
    transform: ImageTransform;
    distance: number;
    moved: boolean;
    pinched: boolean;
    swipe: boolean;
  } | null>(null);
  const lastTap = useRef<{ time: number; point: Point } | null>(null);
  const lastTouch = useRef(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Image identity is the reset trigger, including a change to an empty source.
  useLayoutEffect(() => {
    // Keep the viewport mounted so keyboard focus survives a change of image.
    current.current = INITIAL_IMAGE_TRANSFORM;
    setTransform(INITIAL_IMAGE_TRANSFORM);
    setSmooth(false);
    pointers.current.clear();
    gesture.current = null;
    lastTap.current = null;
  }, [imageKey]);

  const measure = () => {
    const rect = viewportRef.current?.getBoundingClientRect();
    return {
      width: rect?.width || 1,
      height: rect?.height || 1,
      imageWidth: imageRef.current?.naturalWidth || 0,
      imageHeight: imageRef.current?.naturalHeight || 0,
    };
  };
  const update = (value: ImageTransform, animate = false) => {
    const bounded = constrainImageTransform(value, measure());
    current.current = bounded;
    setSmooth(animate);
    setTransform(bounded);
  };
  const reset = () => update(INITIAL_IMAGE_TRANSFORM, true);
  const zoomTo = (scale: number, clientPoint?: Point, animate = true) => {
    if (!enabled) return;
    const rect = viewportRef.current?.getBoundingClientRect();
    const point =
      rect && clientPoint
        ? {
            x: clientPoint.x - rect.left - rect.width / 2,
            y: clientPoint.y - rect.top - rect.height / 2,
          }
        : { x: 0, y: 0 };
    update(scaleImageAtPoint(current.current, scale, point, measure()), animate);
  };
  const toggleZoom = (point?: Point) => {
    if (current.current.scale > 1) reset();
    else zoomTo(2, point);
  };

  const interruptZoom = () => {
    const element = transformRef.current;
    if (!element?.getAnimations().some((animation) => animation.playState === 'running')) return;
    // Start direct manipulation at the visible scale, even halfway through a button zoom.
    const matrix = new DOMMatrixReadOnly(getComputedStyle(element).transform);
    update({ scale: matrix.a, x: matrix.m41, y: matrix.m42 });
  };

  const onWheel = useEffectEvent((event: WheelEvent) => {
    // Preserve browser/page zoom; ordinary wheel movement belongs to the image viewport.
    if (!enabled || event.ctrlKey || event.metaKey || event.altKey) return;
    event.preventDefault();
    interruptZoom();
    zoomTo(
      current.current.scale * Math.exp(-event.deltaY * (event.deltaMode === 1 ? 0.04 : 0.002)),
      {
        x: event.clientX,
        y: event.clientY,
      },
      false,
    );
  });
  const onResize = useEffectEvent(() => update(current.current));
  const onEscape = useEffectEvent((event: globalThis.KeyboardEvent) => {
    if (event.key !== 'Escape' || current.current.scale <= 1) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    reset();
  });
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const wheel = (event: WheelEvent) => onWheel(event);
    const handleEscape = (event: globalThis.KeyboardEvent) => onEscape(event);
    const observer = new ResizeObserver(() => onResize());
    viewport.addEventListener('wheel', wheel, { passive: false });
    document.addEventListener('keydown', handleEscape, true);
    observer.observe(viewport);
    return () => {
      viewport.removeEventListener('wheel', wheel);
      document.removeEventListener('keydown', handleEscape, true);
      observer.disconnect();
    };
  }, []);

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (!enabled || (event.pointerType === 'mouse' && event.button !== 0)) return;
    interruptZoom();
    if (event.pointerType === 'touch') lastTouch.current = Date.now();
    const point = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, point);
    event.currentTarget.setPointerCapture(event.pointerId);
    const points = [...pointers.current.values()];
    const first = points[0];
    const second = points[1];
    gesture.current = {
      start: second ? { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 } : first,
      distance: second ? Math.hypot(first.x - second.x, first.y - second.y) : 0,
      transform: current.current,
      moved: Boolean(second) || Boolean(gesture.current?.moved),
      pinched: Boolean(second) || Boolean(gesture.current?.pinched),
      swipe: event.pointerType === 'touch' && point.x > 32 && point.x < window.innerWidth - 32,
    };
  };
  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (!pointers.current.has(event.pointerId) || !gesture.current) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = [...pointers.current.values()];
    const first = points[0];
    const second = points[1];
    const start = gesture.current;
    const midpoint = second ? { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 } : first;
    const dx = midpoint.x - start.start.x;
    const dy = midpoint.y - start.start.y;
    if (Math.hypot(dx, dy) > 8) start.moved = true;
    if (second && start.distance > 0) {
      const rect = event.currentTarget.getBoundingClientRect();
      const scale =
        (start.transform.scale * Math.hypot(first.x - second.x, first.y - second.y)) /
        start.distance;
      const scaled = scaleImageAtPoint(
        start.transform,
        scale,
        {
          x: start.start.x - rect.left - rect.width / 2,
          y: start.start.y - rect.top - rect.height / 2,
        },
        measure(),
      );
      update({ ...scaled, x: scaled.x + dx, y: scaled.y + dy });
    } else if (start.transform.scale > 1) {
      update({ ...start.transform, x: start.transform.x + dx, y: start.transform.y + dy });
    } else if (Math.abs(dy) > Math.max(10, Math.abs(dx))) {
      start.swipe = false;
    }
  };
  const finishPointer = (event: PointerEvent<HTMLElement>, cancelled: boolean) => {
    const start = gesture.current;
    pointers.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (pointers.current.size) {
      const remaining = [...pointers.current.values()][0];
      gesture.current = {
        start: remaining,
        transform: current.current,
        distance: 0,
        moved: true,
        pinched: true,
        swipe: false,
      };
      return;
    }
    gesture.current = null;
    if (!start || cancelled) {
      lastTap.current = null;
      return;
    }
    const point = { x: event.clientX, y: event.clientY };
    const dx = point.x - start.start.x;
    const dy = point.y - start.start.y;
    if (
      !start.pinched &&
      start.transform.scale === 1 &&
      start.swipe &&
      Math.abs(dx) >= 48 &&
      Math.abs(dx) > Math.abs(dy) * 1.5
    ) {
      lastTap.current = null;
      if (dx < 0) next();
      else prev();
    } else if (event.pointerType === 'touch' && !start.moved && Math.hypot(dx, dy) < 8) {
      const previous = lastTap.current;
      if (
        previous &&
        Date.now() - previous.time < 300 &&
        Math.hypot(point.x - previous.point.x, point.y - previous.point.y) < 32
      ) {
        toggleZoom(point);
        lastTap.current = null;
      } else lastTap.current = { time: Date.now(), point };
    } else lastTap.current = null;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!enabled || event.altKey || event.ctrlKey || event.metaKey) return;
    if (['+', '=', '-', '0', 'Enter', ' '].includes(event.key)) {
      event.preventDefault();
      if (event.key === '0') reset();
      else if (event.key === '-') zoomTo(current.current.scale / 1.5);
      else if (event.key === '+' || event.key === '=') zoomTo(current.current.scale * 1.5);
      else toggleZoom();
    } else if (current.current.scale > 1 && event.key.startsWith('Arrow')) {
      event.preventDefault();
      update({
        ...current.current,
        x:
          current.current.x +
          (event.key === 'ArrowLeft' ? 60 : event.key === 'ArrowRight' ? -60 : 0),
        y: current.current.y + (event.key === 'ArrowUp' ? 60 : event.key === 'ArrowDown' ? -60 : 0),
      });
    }
  };

  return {
    viewportRef,
    imageRef,
    transformRef,
    transform,
    smooth,
    reset,
    zoomTo,
    toggleZoom,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: (event: PointerEvent<HTMLElement>) => finishPointer(event, false),
      onPointerCancel: (event: PointerEvent<HTMLElement>) => finishPointer(event, true),
      onDoubleClick: (event: MouseEvent<HTMLElement>) => {
        // Touch double-taps already zoom on pointerup; ignore their compatibility mouse event.
        if (Date.now() - lastTouch.current > 500) {
          toggleZoom({ x: event.clientX, y: event.clientY });
        }
      },
      onKeyDown,
    },
  };
}
