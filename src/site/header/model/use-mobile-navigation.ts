'use client';

import type { RefObject } from 'react';
import { useEffect, useEffectEvent } from 'react';
import { captureFocusReturn } from '@/shared/lib/focus-return';
import { isImeComposing } from '@/shared/lib/keyboard-composition';

export function useMobileNavigation(
  surfaceRef: RefObject<HTMLElement | null>,
  openerRef: RefObject<HTMLButtonElement | null>,
  isOpen: boolean,
  onClose: () => void,
) {
  const close = useEffectEvent(onClose);
  useEffect(() => {
    const surface = surfaceRef.current;
    if (!isOpen || !surface) return;
    const focusReturn = captureFocusReturn(openerRef.current);
    let restoreFocus = true;
    const desktop = window.matchMedia('(min-width: 1280px)');
    const resize = () => {
      if (desktop.matches) close();
    };
    const isInside = (target: EventTarget | null) =>
      target instanceof Node && (surface.contains(target) || openerRef.current?.contains(target));
    const leave = (event: Event) => {
      if (isInside(event.target)) return;
      restoreFocus = false;
      close();
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isImeComposing(event) || event.key !== 'Escape') return;
      event.preventDefault();
      close();
    };
    surface.querySelector<HTMLElement>('a[href], button')?.focus({ preventScroll: true });
    document.addEventListener('keydown', keydown);
    document.addEventListener('pointerdown', leave);
    document.addEventListener('focusin', leave);
    desktop.addEventListener('change', resize);
    resize();
    return () => {
      document.removeEventListener('keydown', keydown);
      document.removeEventListener('pointerdown', leave);
      document.removeEventListener('focusin', leave);
      desktop.removeEventListener('change', resize);
      if (
        restoreFocus &&
        (surface.contains(document.activeElement) ||
          document.activeElement === document.body ||
          document.activeElement === openerRef.current)
      )
        focusReturn.restore();
      else focusReturn.dispose();
    };
  }, [isOpen, openerRef, surfaceRef]);
}
