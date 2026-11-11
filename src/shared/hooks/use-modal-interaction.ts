'use client';

import type { RefObject } from 'react';
import { useEffect, useEffectEvent } from 'react';
import { captureFocusReturn } from '@/shared/lib/focus-return';
import { isImeComposing } from '@/shared/lib/keyboard-composition';

/** Shared keyboard, focus and background handling for both window and immersive dialogs. */
export function useModalInteraction(
  ref: RefObject<HTMLElement | null>,
  isOpen: boolean,
  onClose: () => void,
) {
  const close = useEffectEvent(onClose);

  useEffect(() => {
    const dialog = ref.current;
    if (!isOpen || !dialog) return;

    const previousFocus = document.activeElement;
    const focusReturn = captureFocusReturn(
      previousFocus instanceof HTMLElement ? previousFocus : null,
    );
    const previousOverflow = document.documentElement.style.overflow;
    const background = Array.from(document.body.children).filter(
      (element): element is HTMLElement =>
        element instanceof HTMLElement &&
        !element.contains(dialog) &&
        !element.matches('script, style, nextjs-portal'),
    );
    const previousInert = background.map((element) => element.inert);
    for (const element of background) element.inert = true;
    document.documentElement.style.overflow = 'hidden';

    const focusableElements = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
        ),
      ).filter((element) => !element.closest('[inert]') && element.getClientRects().length > 0);

    (
      dialog.querySelector<HTMLElement>('[data-dialog-initial-focus]') ??
      dialog.querySelector<HTMLElement>('[data-dialog-close]') ??
      dialog
    ).focus({ preventScroll: true });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isImeComposing(event) || dialog.closest('[inert]')) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      } else if (event.key === 'Tab') {
        const elements = focusableElements();
        const first = elements[0];
        const last = elements.at(-1);
        const active = document.activeElement;
        if (!first || !last) {
          event.preventDefault();
          dialog.focus();
        } else if (
          event.shiftKey &&
          (!active ||
            !dialog.contains(active) ||
            !elements.some(
              (element) =>
                element.compareDocumentPosition(active) & Node.DOCUMENT_POSITION_FOLLOWING,
            ))
        ) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          (!active ||
            !dialog.contains(active) ||
            !elements.some(
              (element) =>
                active.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING,
            ))
        ) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.documentElement.style.overflow = previousOverflow;
      background.forEach((element, index) => {
        element.inert = previousInert[index];
      });
      focusReturn.restore();
    };
  }, [isOpen, ref]);
}
