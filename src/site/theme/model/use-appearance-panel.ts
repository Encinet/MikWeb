'use client';

import type { RefObject } from 'react';
import { useLayoutEffect } from 'react';
import { captureFocusReturn } from '@/shared/lib/focus-return';
import { anchoredSurfacePosition, readSafeViewportBounds } from '@/shared/lib/viewport-bounds';

export function useAppearancePanel(
  ref: RefObject<HTMLDialogElement | null>,
  anchorRef: RefObject<HTMLButtonElement | null>,
  onClose: () => void,
) {
  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const sheetQuery = window.matchMedia('(max-width: 639px)');
    const shortQuery = window.matchMedia('(max-height: 480px)');
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    const focusReturn = captureFocusReturn(anchorRef.current);
    let modal = false;

    const position = () => {
      const anchor = anchorRef.current?.getBoundingClientRect();
      if (!anchor) return;
      const viewport = readSafeViewportBounds();
      dialog.style.setProperty('--appearance-viewport-width', `${viewport.width}px`);
      dialog.style.setProperty('--appearance-viewport-height', `${viewport.height}px`);
      if (modal) return;
      const { top, left } = anchoredSurfacePosition(
        anchor,
        { width: dialog.offsetWidth, height: dialog.offsetHeight },
        viewport,
        12,
      );
      dialog.style.setProperty('--appearance-panel-top', `${top}px`);
      dialog.style.setProperty('--appearance-panel-left', `${left}px`);
    };
    const present = () => {
      if (dialog.open) dialog.close();
      modal = sheetQuery.matches || shortQuery.matches;
      root.style.overflow = modal ? 'hidden' : previousOverflow;
      if (modal) dialog.showModal();
      else dialog.show();
      position();
      dialog
        .querySelector<HTMLInputElement>('input[name$="-mode"]:checked')
        ?.focus({ preventScroll: true });
    };
    present();

    const cancel = (event: Event) => {
      event.preventDefault();
      onClose();
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cancel(event);
    };
    const isInside = (target: EventTarget | null) =>
      target instanceof Node && (dialog.contains(target) || anchorRef.current?.contains(target));
    const pointerdown = (event: PointerEvent) => {
      if (!modal && !isInside(event.target)) onClose();
      if (modal && event.target === dialog) {
        const rect = dialog.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          onClose();
      }
    };
    const focusin = (event: FocusEvent) => {
      if (!modal && !isInside(event.target)) onClose();
    };
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(position);
    observer?.observe(dialog);
    if (anchorRef.current) observer?.observe(anchorRef.current);
    dialog.addEventListener('cancel', cancel);
    document.addEventListener('keydown', keydown);
    document.addEventListener('pointerdown', pointerdown);
    document.addEventListener('focusin', focusin);
    window.addEventListener('scroll', position, true);
    window.addEventListener('resize', position);
    window.visualViewport?.addEventListener('resize', position);
    window.visualViewport?.addEventListener('scroll', position);
    sheetQuery.addEventListener('change', present);
    shortQuery.addEventListener('change', present);
    return () => {
      observer?.disconnect();
      dialog.removeEventListener('cancel', cancel);
      document.removeEventListener('keydown', keydown);
      document.removeEventListener('pointerdown', pointerdown);
      document.removeEventListener('focusin', focusin);
      window.removeEventListener('scroll', position, true);
      window.removeEventListener('resize', position);
      window.visualViewport?.removeEventListener('resize', position);
      window.visualViewport?.removeEventListener('scroll', position);
      sheetQuery.removeEventListener('change', present);
      shortQuery.removeEventListener('change', present);
      const shouldRestoreFocus =
        dialog.contains(document.activeElement) || document.activeElement === anchorRef.current;
      if (dialog.open) dialog.close();
      root.style.overflow = previousOverflow;
      if (shouldRestoreFocus) focusReturn.restore();
      else focusReturn.dispose();
    };
  }, [anchorRef, onClose, ref]);
}
