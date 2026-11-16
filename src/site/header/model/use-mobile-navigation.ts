'use client';

import type { RefObject } from 'react';
import { useEffectEvent, useLayoutEffect } from 'react';
import { captureFocusReturn } from '@/shared/lib/focus-return';
import { isImeComposing } from '@/shared/lib/keyboard-composition';
import { readSafeViewportBounds } from '@/shared/lib/viewport-bounds';

export function useMobileNavigation(
  surfaceRef: RefObject<HTMLElement | null>,
  openerRef: RefObject<HTMLButtonElement | null>,
  isOpen: boolean,
  onClose: () => void,
) {
  const close = useEffectEvent(onClose);
  useLayoutEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;
    surface.inert = !isOpen;
    if (!isOpen) {
      surface.setAttribute('aria-hidden', 'true');
      return;
    }
    surface.removeAttribute('aria-hidden');
    const focusReturn = captureFocusReturn(openerRef.current);
    let restoreFocus = true;
    const desktop = window.matchMedia('(min-width: 1280px)');
    const position = () => {
      const anchor = openerRef.current?.getBoundingClientRect();
      if (!anchor) return;
      const viewport = readSafeViewportBounds();
      const gutter = 16;
      const top = anchor.bottom + 8;
      surface.style.setProperty(
        '--mobile-menu-max-width',
        `${Math.max(0, viewport.width - gutter * 2)}px`,
      );
      surface.style.setProperty(
        '--mobile-menu-max-height',
        `${Math.max(0, viewport.top + viewport.height - top - gutter)}px`,
      );
      const left = Math.max(
        viewport.left + gutter,
        Math.min(anchor.left, viewport.left + viewport.width - surface.offsetWidth - gutter),
      );
      surface.style.setProperty('--mobile-menu-top', `${top}px`);
      surface.style.setProperty('--mobile-menu-left', `${left}px`);
    };
    const resize = () => {
      if (desktop.matches) close();
      else position();
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
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(position);
    observer?.observe(surface);
    if (openerRef.current) {
      observer?.observe(openerRef.current);
      if (openerRef.current.parentElement) observer?.observe(openerRef.current.parentElement);
    }
    window.addEventListener('resize', resize);
    window.addEventListener('scroll', position, true);
    window.visualViewport?.addEventListener('resize', position);
    window.visualViewport?.addEventListener('scroll', position);
    resize();
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', position, true);
      window.visualViewport?.removeEventListener('resize', position);
      window.visualViewport?.removeEventListener('scroll', position);
      document.removeEventListener('keydown', keydown);
      document.removeEventListener('pointerdown', leave);
      document.removeEventListener('focusin', leave);
      desktop.removeEventListener('change', resize);
      // AnimatePresence retains this surface during exit, after navigation has closed.
      surface.inert = true;
      surface.setAttribute('aria-hidden', 'true');
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
